import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/use-parallax';

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export function AnimatedText({ 
  text, 
  className = '', 
  delay = 0,
  staggerDelay = 50,
  as: Component = 'span' 
}: AnimatedTextProps) {
  const [isVisible, setIsVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (prefersReducedMotion) {
    return <Component className={className}>{text}</Component>;
  }

  const words = text.split(' ');

  return (
    <Component className={className} aria-label={text}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block overflow-hidden mr-[0.25em]">
          <span
            className="inline-block transition-transform duration-700 ease-out"
            style={{
              transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
              transitionDelay: `${wordIndex * staggerDelay}ms`,
            }}
          >
            {word}
          </span>
        </span>
      ))}
    </Component>
  );
}

interface TypewriterTextProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
}

export function TypewriterText({ text, className = '', speed = 50, delay = 0 }: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started || prefersReducedMotion) {
      if (prefersReducedMotion) setDisplayText(text);
      return;
    }

    let currentIndex = 0;
    const intervalId = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed, started, prefersReducedMotion]);

  return (
    <span className={className} aria-label={text}>
      {displayText}
      {started && displayText.length < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
}
