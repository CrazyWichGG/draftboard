import os
import re
import json
import urllib.request
import io
from PIL import Image, ImageSequence

def main():
    print("=== DRAFTBOARD GOAL ICON SCRAPER & WEBP MIGRATOR ===")
    
    # 1. Load local GOALS.json
    goals_json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "GOALS.json"))
    with open(goals_json_path, "r", encoding="utf8") as f:
        goals_list = json.load(f)
    
    print(f"Loaded {len(goals_list)} goals from GOALS.json")

    # Build lookup map: (id, data) -> goal_dict
    goal_map = {}
    for g in goals_list:
        key = (g.get("id"), g.get("data"))
        goal_map[key] = g

    # 2. Dynamically discover live site asset map from draftoutmc.com/wiki
    wiki_url = "https://draftoutmc.com/wiki"
    wiki_req = urllib.request.Request(wiki_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(wiki_req) as resp:
        wiki_html = resp.read().decode("utf8")
    
    preload_match = re.search(r'/assets/use-goal-icon-preload-[a-zA-Z0-9_-]+\.js', wiki_html)
    if preload_match:
        preload_url = f"https://draftoutmc.com{preload_match.group(0)}"
    else:
        preload_url = "https://draftoutmc.com/assets/use-goal-icon-preload-CNZFPKCC.js"
    
    print(f"Fetching live goal asset mapping from: {preload_url}")
    req = urllib.request.Request(preload_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        preload_text = resp.read().decode("utf8")

    regex = re.compile(r'"([^":]+::[^"]+)":\{path:`([^`]+)`,label:`([^`]+)`(?:,enchanted:(true|false|!0|!1))?')
    site_entries = []
    for match in regex.finditer(preload_text):
        full_key = match.group(1)
        path = match.group(2)
        label = match.group(3)
        enchanted = match.group(4) in ("true", "!0")
        
        id_val, data_val = full_key.split("::")
        data = None if data_val == "null" else data_val
        site_entries.append({
            "full_key": full_key,
            "id": id_val,
            "data": data,
            "path": path,
            "label": label,
            "enchanted": enchanted
        })

    print(f"Found {len(site_entries)} goal entries on draftoutmc.com")

    goals_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "assets", "goals"))
    os.makedirs(goals_dir, exist_ok=True)

    animated_processed = 0
    static_processed = 0
    enchanted_tagged = 0
    skipped_count = 0

    print(f"Processing {len(site_entries)} goal icons...")

    for entry in site_entries:
        goal_obj = goal_map.get((entry["id"], entry["data"]))
        if not goal_obj:
            # Fallback by ID
            for (g_id, g_data), g_ref in goal_map.items():
                if g_id == entry["id"]:
                    goal_obj = g_ref
                    break

        if not goal_obj:
            skipped_count += 1
            continue

        # Tag enchanted property in GOALS.json ONLY if site marks it enchanted
        if entry["enchanted"]:
            goal_obj["enchanted"] = True
            enchanted_tagged += 1

        # Derive webp texture filename
        orig_texture = goal_obj.get("texture", "")
        basename = os.path.basename(orig_texture)
        name_without_ext = os.path.splitext(basename)[0]
        webp_filename = f"{name_without_ext}.webp"
        webp_texture_path = f"/assets/goals/{webp_filename}"
        
        # Update texture path in GOALS.json
        goal_obj["texture"] = webp_texture_path

        target_filepath = os.path.join(goals_dir, webp_filename)
        img_url = f"https://draftoutmc.com{entry['path']}"

        try:
            img_req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(img_req) as img_resp:
                img_data = img_resp.read()

            im = Image.open(io.BytesIO(img_data))
            is_animated = getattr(im, "is_animated", False) and getattr(im, "n_frames", 1) > 1

            if is_animated:
                frames = []
                durations = []
                for frame in ImageSequence.Iterator(im):
                    frames.append(frame.copy().convert("RGBA"))
                    durations.append(frame.info.get("duration", 1000))
                
                avg_duration = durations[0] if durations else 1000
                frames[0].save(
                    target_filepath,
                    format="WEBP",
                    save_all=True,
                    append_images=frames[1:],
                    duration=avg_duration,
                    loop=0,
                    method=6
                )
                animated_processed += 1
            else:
                im.convert("RGBA").save(target_filepath, format="WEBP", method=6)
                static_processed += 1

        except Exception as err:
            print(f"[ERROR] Failed downloading {entry['full_key']} ({img_url}): {err}")

    # Write updated GOALS.json
    with open(goals_json_path, "w", encoding="utf8") as f:
        json.dump(goals_list, f, indent=2)
    print("Updated GOALS.json with webp texture paths & enchanted properties!")

    print("\n================================")
    print("SCRAPING COMPLETED SUCCESSFULLY!")
    print("================================")
    print(f"- Total Animated WebP Goals: {animated_processed}")
    print(f"- Total Static WebP Goals: {static_processed}")
    print(f"- Tagged Enchanted Goals: {enchanted_tagged}")
    print(f"- Skipped Unmapped Goals: {skipped_count}")
    print("================================")

if __name__ == "__main__":
    main()
