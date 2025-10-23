/**
 * Centralized prompts and personality trait statements
 * Used throughout the application for personality analysis and group discussions
 */

// Personality Trait Statements
export const PERSONALITY_STATEMENTS = {
  placement: {
    top: 'tendency to be positive and optimistic.',
    middle: 'tendency to be a realist.',
    bottom: 'tendency to be pessimistic and may be prone to behaving negatively.',
  },
  orientation: {
    left: 'believe in tradition and be friendly; may remember dates well.',
    right: 'innovative and active; may forget dates and may not have a strong sense of family.',
    front: 'direct; may enjoy playing devil\'s advocate; not prone to fearing or avoiding confrontational discussions.',
  },
  details: {
    many: 'analytical; may be cautious and struggle with trust.',
    few: 'emotional; big-picture; great risk taker; may be reckless or impulsive.',
  },
  legs: {
    four: 'secure and stick to ideals; may be described as stubborn.',
    lessThanFour: 'major period of change; may struggle with insecurities.',
  },
  ears: {
    large: 'good listener (the bigger, the better).',
  },
  tail: {
    long: 'indicates intelligence (the longer, the better).',
  },
} as const;

// Group Discussion Prompts
export const DISCUSSION_PROMPTS = [
  "Who drew at the top of the page? Do they tend to be optimistic in real life?",
  "Who drew at the bottom? Are they more realistic or pessimistic?",
  "Which direction are most pigs facing? What does this say about the group?",
  "Who included the most details? Are they analytical thinkers?",
  "Compare leg counts. Who might be going through changes?",
  "Were the interpretations accurate? Discuss similarities and differences.",
] as const;

// Personality Test Instructions
export const TEST_INSTRUCTIONS = {
  drawing: [
    'Draw a pig on a piece of paper',
    'Take your time - there are no right or wrong answers',
    'Be creative and draw what comes naturally to you',
    'Include as much or as little detail as you like',
  ],
  upload: [
    'Take a clear photo of your drawing',
    'Ensure good lighting and the entire pig is visible',
    'Upload the image for analysis',
    'Receive your personality insights',
  ],
  group: [
    'Each person draws their own pig',
    'Upload all drawings together',
    'Compare results across the group',
    'Use discussion prompts to explore personality differences',
  ],
} as const;

// Analysis Rubric (for documentation)
export const ANALYSIS_RUBRIC = {
  placement: {
    description: 'Vertical position on page',
    top: 'Optimistic, positive outlook',
    middle: 'Realistic, balanced',
    bottom: 'Pessimistic, negative tendency',
    threshold: { top: 0.33, bottom: 0.67 },
  },
  orientation: {
    description: 'Direction the pig is facing',
    left: 'Traditional, friendly',
    right: 'Innovative, active',
    front: 'Direct, confrontational',
  },
  details: {
    description: 'Level of detail in drawing',
    many: 'Analytical, cautious (>5 parts)',
    few: 'Emotional, risk-taker (≤5 parts)',
    threshold: 5,
  },
  legs: {
    description: 'Number of legs drawn',
    four: 'Secure, stubborn',
    lessThanFour: 'Insecure, changing',
  },
  ears: {
    description: 'Relative size of ears',
    large: 'Good listener (>30% of head)',
    threshold: 0.3,
  },
  tail: {
    description: 'Relative length of tail',
    long: 'Intelligent (>40% of body)',
    threshold: 0.4,
  },
} as const;
