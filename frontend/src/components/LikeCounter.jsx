import { useState, useEffect, useRef } from 'react';

/**
 * LikeCounter displays the total like count with advanced TikTok-style heart animations
 * Features: Heart beat animation, floating hearts on like increases, burst effects
 */
export default function LikeCounter({ totalLikes }) {
  const [animationKey, setAnimationKey] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevLikesRef = useRef(totalLikes);
  const heartsIdRef = useRef(0);

  // Trigger animation when likes increase
  useEffect(() => {
    const prevLikes = prevLikesRef.current;
    if (totalLikes > prevLikes) {
      // Trigger main heart animation
      setAnimationKey(prev => prev + 1);
      setIsAnimating(true);
      
      // Create floating hearts based on like increase
      const increment = totalLikes - prevLikes;
      const heartsToAdd = Math.min(Math.ceil(increment / 10), 5); // Max 5 hearts
      
      const newHearts = [];
      for (let i = 0; i < heartsToAdd; i++) {
        newHearts.push({
          id: heartsIdRef.current++,
          delay: i * 0.15, // Stagger the hearts (seconds)
          side: Math.random() > 0.5 ? 'left' : 'right' // Randomly position
        });
      }
      
      setFloatingHearts(prev => [...prev, ...newHearts]);
      
      // Clear animation state
      setTimeout(() => setIsAnimating(false), 0.8 * 1000); // 0.8 seconds
    }
    prevLikesRef.current = totalLikes;
  }, [totalLikes]);

  // Clean up floating hearts after animation
  useEffect(() => {
    if (floatingHearts.length > 0) {
      const timer = setTimeout(() => {
        setFloatingHearts([]);
      }, 2.5 * 1000); // Clean up after all animations complete (2.5 seconds)
      
      return () => clearTimeout(timer);
    }
  }, [floatingHearts]);

  return (
    <div className="relative flex items-center gap-4 p-4 bg-gradient-to-r from-tiktok-red/10 to-tiktok-pink/10 rounded-xl border border-tiktok-red/20 overflow-hidden">
      {/* Floating Hearts Container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden floating-hearts-container">
        {floatingHearts.map((heart) => (
          <FloatingHeart
            key={heart.id}
            delay={heart.delay}
            side={heart.side}
            onComplete={() => {
              setFloatingHearts(prev => prev.filter(h => h.id !== heart.id));
            }}
          />
        ))}
      </div>

      {/* Animated Heart Icon */}
      <div className="relative z-10">
        <div 
          key={animationKey}
          className={`text-4xl ${isAnimating ? 'animate-scaleHeart' : 'animate-heartBeat'}`}
        >
          ❤️
        </div>
        {/* Subtle pulse effect */}
        <div className="absolute inset-0 text-4xl text-tiktok-pink opacity-20 animate-heartBeat" 
             style={{ animationDelay: '0.75s' }}>
          ❤️
        </div>
      </div>
      
      {/* Like Count Display */}
      <div className="flex-1 z-10">
        <div className="text-sm text-gray-400 font-medium mb-1">Total Likes</div>
        <div 
          key={`count-${animationKey}`}
          className={`text-4xl font-bold text-tiktok-red tabular-nums leading-none transition-all duration-300 ${
            isAnimating ? 'animate-heartBurst' : ''
          }`}
          aria-live="polite"
          aria-label={`Total likes: ${totalLikes.toLocaleString()}`}
        >
          {totalLikes.toLocaleString()}
        </div>
      </div>
      
      {/* Decorative Hearts (Static) */}
      <div className="hidden sm:flex flex-col gap-1 z-10">
        {[...Array(3)].map((_, i) => (
          <div 
            key={i}
            className="text-tiktok-red opacity-40 transition-opacity duration-300 hover:opacity-80"
            style={{ 
              fontSize: `${18 - i * 3}px`,
              animationDelay: `${i * 0.5}s` // Already in seconds
            }}
          >
            ♡
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * FloatingHeart component for individual floating heart animations
 */
function FloatingHeart({ delay, side, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start animation after delay
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, delay * 1000); // Convert seconds to milliseconds

    // Complete animation and cleanup
    const completeTimer = setTimeout(() => {
      onComplete();
    }, (delay + 2.0) * 1000); // delay + 2.0 seconds

    return () => {
      clearTimeout(showTimer);
      clearTimeout(completeTimer);
    };
  }, [delay, onComplete]);

  if (!isVisible) return null;

  const leftPosition = side === 'left' ? '10%' : '80%';
  const heartVariations = ['❤️', '💕', '💖', '♥️'];
  const randomHeart = heartVariations[Math.floor(Math.random() * heartVariations.length)];
  const randomSize = 16 + Math.random() * 8; // 16-24px

  return (
    <div
      className="absolute animate-floatUp pointer-events-none floating-heart"
      style={{
        left: leftPosition,
        bottom: '50%',
        fontSize: `${randomSize}px`,
        transform: `translateX(${(Math.random() - 0.5) * 40}px)`,
        zIndex: 5
      }}
    >
      {randomHeart}
    </div>
  );
}
