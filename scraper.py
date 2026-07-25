import os
import re
import sys
import time
import base64
import urllib.request
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# --- Configuration ---
URL = "https://draftoutmc.com/wiki"
SAVE_PATH = "./assets/goals/"


def create_driver():
    """Tries creating a Chrome headless driver, falling back to Firefox headless if Chrome binary is missing."""
    try:
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--window-size=1920,1080')
        driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=options)
        print("Using Chrome headless driver.")
        return driver
    except Exception as e:
        print(f"Chrome unavailable ({e}). Trying Firefox...")

    try:
        from selenium.webdriver.firefox.options import Options as FirefoxOptions
        options = FirefoxOptions()
        options.add_argument('--headless')
        options.add_argument('--window-size=1920,1080')
        driver = webdriver.Firefox(service=FirefoxService(GeckoDriverManager().install()), options=options)
        print("Using Firefox headless driver.")
        return driver
    except Exception as e:
        raise RuntimeError(f"Could not initialize Chrome or Firefox WebDrivers: {e}")


def to_snake_case(text):
    """Converts a goal title to a clean snake_case string."""
    # Replace non-alphanumeric characters with underscores
    snake = re.sub(r'[^a-zA-Z0-9]', '_', text)
    # Replace multiple underscores with a single one and strip leading/trailing
    return re.sub(r'_+', '_', snake).strip('_').lower()


def scrape_static_html(html_content, save_path=SAVE_PATH):
    """Parses static HTML content using BeautifulSoup and downloads images."""
    os.makedirs(save_path, exist_ok=True)
    soup = BeautifulSoup(html_content, 'html.parser')
    tiles = soup.find_all('li', class_=lambda c: c and 'group/tile' in c)
    print(f"Found {len(tiles)} goals in static HTML.")

    saved_count = 0
    for tile in tiles:
        p_tag = tile.find('p')
        if not p_tag:
            continue
        goal_name = p_tag.get('title') or p_tag.text.strip()
        if not goal_name:
            continue

        snake_case_name = to_snake_case(goal_name)
        img_tag = tile.find('img')
        if not img_tag or not img_tag.get('src'):
            print(f"Skipped (No img src): {goal_name}")
            continue

        src = img_tag['src']
        filepath = os.path.join(save_path, f"{snake_case_name}.png")

        if src.startswith('data:image'):
            # Base64 data URL
            header, encoded = src.split(',', 1)
            with open(filepath, "wb") as f:
                f.write(base64.b64decode(encoded))
            saved_count += 1
            print(f"[{saved_count}] Saved base64 image: {filepath}")
        elif src.startswith(('http://', 'https://')):
            try:
                urllib.request.urlretrieve(src, filepath)
                saved_count += 1
                print(f"[{saved_count}] Downloaded image: {filepath}")
            except Exception as e:
                print(f"Failed to download {src} for {goal_name}: {e}")
        elif src.startswith('blob:'):
            print(f"Skipped blob URL in static HTML (requires Selenium browser session): {goal_name}")

    print(f"Static HTML parsing complete! Processed {saved_count} images.")


def scrape_live_site(url=URL, save_path=SAVE_PATH):
    """Scrapes live site using Selenium to render JS and extract in-memory blob/canvas images."""
    os.makedirs(save_path, exist_ok=True)

    driver = create_driver()

    print(f"Loading {url} in headless browser...")
    driver.get(url)

    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.XPATH, "//li[contains(@class, 'group/tile')]"))
        )
    except Exception as e:
        print("Failed to load tiles within the timeout period.")
        driver.quit()
        return

    time.sleep(3)

    # Scroll page to ensure all tiles in the scroll container are rendered
    scroll_containers = driver.find_elements(By.XPATH, "//div[@data-page-scroll='true']")
    if scroll_containers:
        print("Scrolling container to load all goal tiles...")
        scroll_elem = scroll_containers[0]
        last_height = driver.execute_script("return arguments[0].scrollHeight", scroll_elem)
        for _ in range(10):
            driver.execute_script("arguments[0].scrollTop += 2000;", scroll_elem)
            time.sleep(0.5)
            new_height = driver.execute_script("return arguments[0].scrollHeight", scroll_elem)
            if new_height == last_height:
                break
            last_height = new_height
        driver.execute_script("arguments[0].scrollTop = 0;", scroll_elem)
        time.sleep(1)

    tiles = driver.find_elements(By.XPATH, "//li[contains(@class, 'group/tile')]")
    print(f"Found {len(tiles)} goals. Starting extraction...")

    saved_count = 0
    for tile in tiles:
        try:
            p_tag = tile.find_element(By.XPATH, ".//p")
            goal_name = p_tag.get_attribute("title") or p_tag.text
            if not goal_name:
                continue
            snake_case_name = to_snake_case(goal_name)

            base64_string = None
            imgs = tile.find_elements(By.XPATH, ".//img")
            canvases = tile.find_elements(By.XPATH, ".//canvas")

            if imgs:
                base64_string = driver.execute_script("""
                    var img = arguments[0];
                    var canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width || 64;
                    canvas.height = img.naturalHeight || img.height || 64;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    return canvas.toDataURL('image/png').split(',')[1];
                """, imgs[0])
            elif canvases:
                base64_string = driver.execute_script("""
                    return arguments[0].toDataURL('image/png').split(',')[1];
                """, canvases[0])

            if base64_string:
                filepath = os.path.join(save_path, f"{snake_case_name}.png")
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(base64_string))
                saved_count += 1
                print(f"[{saved_count}] Saved: {filepath}")
            else:
                print(f"Skipped (No image/canvas found): {goal_name}")

        except Exception as e:
            print(f"Error processing a tile: {e}")

    driver.quit()
    print(f"Scraping complete! Successfully saved {saved_count} goal images to {save_path}")


def main():
    if len(sys.argv) > 1 and os.path.isfile(sys.argv[1]):
        file_path = sys.argv[1]
        print(f"Reading static HTML file: {file_path}")
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        scrape_static_html(content)
    else:
        scrape_live_site()


if __name__ == "__main__":
    main()