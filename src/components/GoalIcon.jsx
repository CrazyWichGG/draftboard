import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Skull, 
  FlaskConical, 
  Apple, 
  Pickaxe, 
  Shield, 
  Sparkles, 
  Flame, 
  BookOpen,
  Bone,
  Zap,
  Box,
  Compass,
  Trophy
} from 'lucide-react';

export default function GoalIcon({ goal, className = "w-5 h-5 text-cyan-300" }) {
  const [imgError, setImgError] = useState(false);

  // Reset error state if goal object changes
  useEffect(() => {
    setImgError(false);
  }, [goal?.id, goal?.texture]);

  if (!goal) return <Sparkles className={className} />;

  // 1. Try rendering exact texture URL from GOALS.json first
  if (goal.texture && !imgError) {
    const isEnchanted = goal.enchanted === true;
    return (
      <div className="relative w-full h-full inline-block">
        <img
          src={goal.texture}
          alt={goal.text}
          className="w-full h-full object-contain [image-rendering:pixelated]"
          onError={() => setImgError(true)}
        />
        {isEnchanted && (
          <div
            className="mc-glint-overlay"
            style={{
              WebkitMaskImage: `url(${goal.texture})`,
              maskImage: `url(${goal.texture})`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center'
            }}
          />
        )}
      </div>
    );
  }

  // 2. Fallback to thematic icon if texture blob/URL cannot be loaded by browser
  const text = (goal.text || '').toLowerCase();
  const id = (goal.id || '').toLowerCase();

  if (id.includes('kill') || id.includes('damage') || text.includes('kill') || text.includes('deal')) {
    return <Swords className={className} />;
  }
  if (id.includes('die') || text.includes('die') || id.includes('freeze')) {
    return <Skull className={className} />;
  }
  if (id.includes('brew') || id.includes('potion') || id.includes('drink')) {
    return <FlaskConical className={className} />;
  }
  if (id.includes('eat') || id.includes('food') || id.includes('compost') || text.includes('eat')) {
    return <Apple className={className} />;
  }
  if (id.includes('mine') || id.includes('craft') || id.includes('ore') || text.includes('mine') || text.includes('craft')) {
    return <Pickaxe className={className} />;
  }
  if (id.includes('shield') || id.includes('armor') || text.includes('shield')) {
    return <Shield className={className} />;
  }
  if (id.includes('advancement') || text.includes('advancement')) {
    return <Trophy className={className} />;
  }
  if (id.includes('breed') || id.includes('mob') || id.includes('leash')) {
    return <Bone className={className} />;
  }
  if (id.includes('enter') || id.includes('nether') || id.includes('end')) {
    return <Compass className={className} />;
  }
  if (id.includes('effect') || id.includes('status')) {
    return <Zap className={className} />;
  }

  return <Sparkles className={className} />;
}
