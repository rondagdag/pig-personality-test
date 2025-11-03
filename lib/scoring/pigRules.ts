/**
 * Pig Analysis Rules Engine
 * 
 * Implements deterministic rules that translate image detections to personality traits
 * Based on the "Draw the Pig" personality test rubric
 */

import { Detection, PersonalityTrait, Evidence, BoundingBox } from '../types';
import { PERSONALITY_STATEMENTS } from '../prompts';

// Threshold constants for rule evaluation
const PLACEMENT_THRESHOLDS = {
  TOP: 0.33,      // Y centroid < 33% of canvas height
  BOTTOM: 0.67,   // Y centroid > 67% of canvas height
};

const DETAIL_THRESHOLD = 5; // More than 5 detected parts = "many details"

const EAR_SIZE_RATIO = 0.3;  // Ear height > 30% of head height = "large"
const TAIL_LENGTH_RATIO = 0.4; // Tail length > 40% of body width = "long"

/**
 * Main function to analyze detection and generate personality traits
 */
export function analyzePigDrawing(detection: Detection): PersonalityTrait[] {
  const traits: PersonalityTrait[] = [];

  // Rule 1: Vertical Placement
  const placementTrait = evaluatePlacement(detection);
  if (placementTrait) traits.push(placementTrait);

  // Rule 2: Orientation
  const orientationTrait = evaluateOrientation(detection);
  if (orientationTrait) traits.push(orientationTrait);

  // Rule 3: Detail Level
  const detailTrait = evaluateDetailLevel(detection);
  if (detailTrait) traits.push(detailTrait);

  // Rule 4: Leg Count
  const legTrait = evaluateLegCount(detection);
  if (legTrait) traits.push(legTrait);

  // Rule 5: Ear Size
  const earTrait = evaluateEarSize(detection);
  if (earTrait) traits.push(earTrait);

  // Rule 6: Tail Length
  const tailTrait = evaluateTailLength(detection);
  if (tailTrait) traits.push(tailTrait);

  return traits;
}

/**
 * Rule 1: Evaluate vertical placement (top/middle/bottom)
 * Uses direct value from custom analyzer when available
 */
function evaluatePlacement(detection: Detection): PersonalityTrait | null {
  // Use direct value from custom analyzer if available
  const directPlacement = (detection as any).verticalPlacement as string | undefined;
  
  if (directPlacement) {
    const statements: Record<string, string> = {
      'Top': PERSONALITY_STATEMENTS.placement.top,
      'Middle': PERSONALITY_STATEMENTS.placement.middle,
      'Bottom': PERSONALITY_STATEMENTS.placement.bottom,
    };

    return {
      category: 'placement',
      statement: statements[directPlacement] || PERSONALITY_STATEMENTS.placement.middle,
      evidence: {
        key: `placement=${directPlacement}`,
        value: directPlacement,
      },
    };
  }

  // Fallback: Calculate from bounding box
  const bbox = detection.overall.boundingBox;
  const canvas = detection.overall.canvas;

  const centroidY = bbox.y + bbox.height / 2;
  const relativeY = centroidY / canvas.height;

  let statement: string;
  let value: string;

  if (relativeY < PLACEMENT_THRESHOLDS.TOP) {
    statement = PERSONALITY_STATEMENTS.placement.top;
    value = 'Top';
  } else if (relativeY > PLACEMENT_THRESHOLDS.BOTTOM) {
    statement = PERSONALITY_STATEMENTS.placement.bottom;
    value = 'Bottom';
  } else {
    statement = PERSONALITY_STATEMENTS.placement.middle;
    value = 'Middle';
  }

  return {
    category: 'placement',
    statement,
    evidence: {
      key: `placement=${value}`,
      value: Math.round(relativeY * 100) / 100,
    },
  };
}

/**
 * Rule 2: Evaluate orientation (left/right/front)
 * Uses direct value from custom analyzer when available
 */
function evaluateOrientation(detection: Detection): PersonalityTrait | null {
  // Use direct value from custom analyzer if available
  const directOrientation = (detection as any).orientation as string | undefined;
  
  if (directOrientation) {
    const statements: Record<string, string> = {
      'Left': PERSONALITY_STATEMENTS.orientation.left,
      'Right': PERSONALITY_STATEMENTS.orientation.right,
      'Front': PERSONALITY_STATEMENTS.orientation.front,
    };

    return {
      category: 'orientation',
      statement: statements[directOrientation] || PERSONALITY_STATEMENTS.orientation.front,
      evidence: {
        key: `orientation=${directOrientation}`,
        value: directOrientation,
      },
    };
  }

  // Fallback: Calculate from bounding boxes
  const { head, body, ears } = detection;

  if (!head && !body) {
    return {
      category: 'orientation',
      statement: PERSONALITY_STATEMENTS.orientation.front,
      evidence: {
        key: 'orientation=Front',
        value: 'Front (default)',
      },
    };
  }

  let orientation: 'Left' | 'Right' | 'Front' = 'Front';
  
  if (head && body && head.boundingBox && body.boundingBox) {
    const headCenterX = head.boundingBox.x + head.boundingBox.width / 2;
    const bodyCenterX = body.boundingBox.x + body.boundingBox.width / 2;
    const offset = headCenterX - bodyCenterX;
    const bodyWidth = body.boundingBox.width;

    if (Math.abs(offset) > bodyWidth * 0.2) {
      orientation = offset < 0 ? 'Left' : 'Right';
    }
  } else if (ears && ears.length >= 2 && ears[0].boundingBox && ears[1].boundingBox) {
    const ear1 = ears[0].boundingBox;
    const ear2 = ears[1].boundingBox;
    const earSpacing = Math.abs(ear1.x - ear2.x);
    
    if (earSpacing < (ear1.width + ear2.width) * 1.5) {
      orientation = 'Front';
    }
  }

  const statements = {
    Left: PERSONALITY_STATEMENTS.orientation.left,
    Right: PERSONALITY_STATEMENTS.orientation.right,
    Front: PERSONALITY_STATEMENTS.orientation.front,
  };

  return {
    category: 'orientation',
    statement: statements[orientation],
    evidence: {
      key: `orientation=${orientation}`,
      value: orientation,
    },
  };
}

/**
 * Rule 3: Evaluate detail level (many/few)
 */
function evaluateDetailLevel(detection: Detection): PersonalityTrait | null {
  const detailCount = detection.detailCount;
  const isDetailed = detailCount > DETAIL_THRESHOLD;

  return {
    category: 'details',
    statement: isDetailed
      ? PERSONALITY_STATEMENTS.details.many
      : PERSONALITY_STATEMENTS.details.few,
    evidence: {
      key: isDetailed ? 'details=Many' : 'details=Few',
      value: detailCount,
    },
  };
}

/**
 * Rule 4: Evaluate leg count (<4 vs 4)
 * Uses direct value from custom analyzer when available
 */
function evaluateLegCount(detection: Detection): PersonalityTrait | null {
  // Prefer direct value from custom analyzer
  const directLegCount = (detection as any).legCount as number | undefined;
  const legCount = directLegCount ?? detection.legs?.length ?? 0;
  const hasFourLegs = legCount === 4;

  return {
    category: 'legs',
    statement: hasFourLegs
      ? PERSONALITY_STATEMENTS.legs.four
      : PERSONALITY_STATEMENTS.legs.lessThanFour,
    evidence: {
      key: `legs=${legCount}`,
      value: legCount,
    },
  };
}

/**
 * Rule 5: Evaluate ear size (large/normal)
 * Uses direct value from custom analyzer when available
 */
function evaluateEarSize(detection: Detection): PersonalityTrait | null {
  // Use direct value from custom analyzer if available
  const directEarSize = (detection as any).earSize as string | undefined;
  
  if (directEarSize === 'Large') {
    return {
      category: 'ears',
      statement: PERSONALITY_STATEMENTS.ears.large,
      evidence: {
        key: 'ears=Large',
        value: 'Large',
      },
    };
  }

  // If Normal or no value, skip trait (only report if notably large)
  if (directEarSize === 'Normal') {
    return null;
  }

  // Fallback: Calculate from bounding boxes
  const { ears, head } = detection;

  if (!ears || ears.length === 0) {
    return null;
  }

  if (!head || !head.boundingBox) {
    const validEars = ears.filter(e => e.boundingBox);
    if (validEars.length === 0) return null;
    
    const avgEarHeight = validEars.reduce((sum, ear) => sum + ear.boundingBox.height, 0) / validEars.length;
    const canvasHeight = detection.overall.canvas.height;
    const relativeSize = avgEarHeight / canvasHeight;

    if (relativeSize > 0.1) {
      return {
        category: 'ears',
        statement: PERSONALITY_STATEMENTS.ears.large,
        evidence: {
          key: 'ears=Large',
          value: 'Large',
        },
      };
    }
    return null;
  }

  const validEars = ears.filter(e => e.boundingBox);
  if (validEars.length === 0) return null;

  const avgEarHeight = validEars.reduce((sum, ear) => sum + ear.boundingBox.height, 0) / validEars.length;
  const headHeight = head.boundingBox.height;
  const earToHeadRatio = avgEarHeight / headHeight;

  if (earToHeadRatio > EAR_SIZE_RATIO) {
    return {
      category: 'ears',
      statement: PERSONALITY_STATEMENTS.ears.large,
      evidence: {
        key: 'ears=Large',
        value: `${Math.round(earToHeadRatio * 100)}% of head`,
      },
    };
  }

  return null;
}

/**
 * Rule 6: Evaluate tail length (long/normal)
 * Uses direct value from custom analyzer when available (threshold: 0.4)
 */
function evaluateTailLength(detection: Detection): PersonalityTrait | null {
  // Use direct value from custom analyzer if available
  const directTailLength = (detection as any).tailLength as number | undefined;
  
  if (typeof directTailLength === 'number') {
    if (directTailLength > TAIL_LENGTH_RATIO) {
      return {
        category: 'tail',
        statement: PERSONALITY_STATEMENTS.tail.long,
        evidence: {
          key: 'tail=Long',
          value: directTailLength,
        },
      };
    }
    // Normal tail length, skip trait
    return null;
  }

  // Fallback: Calculate from bounding boxes
  const { tail, body } = detection;

  if (!tail || !tail.boundingBox) {
    return null;
  }

  if (!body || !body.boundingBox) {
    const tailLength = Math.max(tail.boundingBox.width, tail.boundingBox.height);
    const canvasSize = Math.max(detection.overall.canvas.width, detection.overall.canvas.height);
    const relativeLength = tailLength / canvasSize;

    if (relativeLength > 0.15) {
      return {
        category: 'tail',
        statement: PERSONALITY_STATEMENTS.tail.long,
        evidence: {
          key: 'tail=Long',
          value: 'Long',
        },
      };
    }
    return null;
  }

  const tailLength = Math.max(tail.boundingBox.width, tail.boundingBox.height);
  const bodyWidth = body.boundingBox.width;
  const tailToBodyRatio = tailLength / bodyWidth;

  if (tailToBodyRatio > TAIL_LENGTH_RATIO) {
    return {
      category: 'tail',
      statement: PERSONALITY_STATEMENTS.tail.long,
      evidence: {
        key: 'tail=Long',
        value: `${Math.round(tailToBodyRatio * 100)}% of body`,
      },
    };
  }

  return null;
}

/**
 * Generate a concise summary from traits
 */
export function generateSummary(traits: PersonalityTrait[]): string {
  if (traits.length === 0) {
    return 'Unable to analyze drawing. Please ensure the pig is clearly visible.';
  }

  const statements = traits.map(t => t.statement);
  
  if (statements.length === 1) {
    return `You have a ${statements[0]}`;
  }

  if (statements.length === 2) {
    return `You ${statements[0]} You also ${statements[1]}`;
  }

  // For 3+ traits, create a flowing summary
  const firstPart = statements.slice(0, -1).join(' You ');
  const lastPart = statements[statements.length - 1];
  
  return `You ${firstPart} Finally, you ${lastPart}`;
}

/**
 * Helper function for testing: create mock detection
 */
export function createMockDetection(overrides?: Partial<Detection>): Detection {
  const defaultBox: BoundingBox = { x: 100, y: 100, width: 200, height: 150 };
  
  return {
    head: { boundingBox: { x: 150, y: 100, width: 100, height: 80 }, confidence: 0.9 },
    body: { boundingBox: { x: 100, y: 150, width: 200, height: 150 }, confidence: 0.95 },
    legs: [
      { boundingBox: { x: 120, y: 280, width: 30, height: 60 }, confidence: 0.85 },
      { boundingBox: { x: 170, y: 280, width: 30, height: 60 }, confidence: 0.85 },
      { boundingBox: { x: 220, y: 280, width: 30, height: 60 }, confidence: 0.85 },
      { boundingBox: { x: 270, y: 280, width: 30, height: 60 }, confidence: 0.85 },
    ],
    ears: [
      { boundingBox: { x: 150, y: 90, width: 25, height: 35 }, confidence: 0.8 },
      { boundingBox: { x: 225, y: 90, width: 25, height: 35 }, confidence: 0.8 },
    ],
    tail: { boundingBox: { x: 300, y: 200, width: 80, height: 20 }, confidence: 0.75 },
    overall: {
      boundingBox: { x: 100, y: 90, width: 280, height: 250 },
      canvas: { width: 500, height: 500 },
    },
    detailCount: 8,
    ...overrides,
  };
}
