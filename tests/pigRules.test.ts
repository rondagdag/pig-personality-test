import { analyzePigDrawing, generateSummary, createMockDetection } from '@/lib/scoring/pigRules';
import { isPigDescription } from '@/lib/azure/content-understanding';
import { Detection } from '@/lib/types';

describe('Pig Rules Engine', () => {
  describe('Placement Analysis', () => {
    test('should identify top placement (optimistic)', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 100, y: 50, width: 200, height: 150 },
          canvas: { width: 500, height: 500 },
        },
      });

      const traits = analyzePigDrawing(detection);
      const placementTrait = traits.find(t => t.category === 'placement');

      expect(placementTrait).toBeDefined();
      expect(placementTrait?.statement).toContain('positive and optimistic');
      expect(placementTrait?.evidence.key).toContain('Top');
    });

    test('should identify middle placement (realist)', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 100, y: 200, width: 200, height: 150 },
          canvas: { width: 500, height: 500 },
        },
      });

      const traits = analyzePigDrawing(detection);
      const placementTrait = traits.find(t => t.category === 'placement');

      expect(placementTrait?.statement).toContain('realist');
      expect(placementTrait?.evidence.key).toContain('Middle');
    });

    test('should identify bottom placement (pessimistic)', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 100, y: 400, width: 200, height: 80 },
          canvas: { width: 500, height: 500 },
        },
      });

      const traits = analyzePigDrawing(detection);
      const placementTrait = traits.find(t => t.category === 'placement');

      expect(placementTrait?.statement).toContain('pessimistic');
      expect(placementTrait?.evidence.key).toContain('Bottom');
    });
  });

  describe('Detail Level Analysis', () => {
    test('should identify many details (analytical)', () => {
      const detection = createMockDetection({
        detailCount: 10,
      });

      const traits = analyzePigDrawing(detection);
      const detailTrait = traits.find(t => t.category === 'details');

      expect(detailTrait?.statement).toContain('analytical');
      expect(detailTrait?.evidence.key).toContain('Many');
    });

    test('should identify few details (emotional)', () => {
      const detection = createMockDetection({
        detailCount: 3,
      });

      const traits = analyzePigDrawing(detection);
      const detailTrait = traits.find(t => t.category === 'details');

      expect(detailTrait?.statement).toContain('emotional');
      expect(detailTrait?.evidence.key).toContain('Few');
    });
  });

  describe('Leg Count Analysis', () => {
    test('should identify 4 legs (secure)', () => {
      const detection = createMockDetection({
        legs: [
          { boundingBox: { x: 120, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 170, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 220, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 270, y: 280, width: 30, height: 60 }, confidence: 0.85 },
        ],
      });

      const traits = analyzePigDrawing(detection);
      const legTrait = traits.find(t => t.category === 'legs');

      expect(legTrait?.statement).toContain('secure and stick to ideals');
      expect(legTrait?.evidence.key).toBe('legs=4');
    });

    test('should identify 3 legs (period of change)', () => {
      const detection = createMockDetection({
        legs: [
          { boundingBox: { x: 120, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 170, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 220, y: 280, width: 30, height: 60 }, confidence: 0.85 },
        ],
      });

      const traits = analyzePigDrawing(detection);
      const legTrait = traits.find(t => t.category === 'legs');

      expect(legTrait?.statement).toContain('major period of change');
      expect(legTrait?.evidence.key).toBe('legs=3');
    });

    test('should handle 2 legs', () => {
      const detection = createMockDetection({
        legs: [
          { boundingBox: { x: 120, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 220, y: 280, width: 30, height: 60 }, confidence: 0.85 },
        ],
      });

      const traits = analyzePigDrawing(detection);
      const legTrait = traits.find(t => t.category === 'legs');

      expect(legTrait?.statement).toContain('major period of change');
      expect(legTrait?.evidence.key).toBe('legs=2');
    });

    test('should handle 0 legs', () => {
      const detection = createMockDetection({
        legs: [],
      });

      const traits = analyzePigDrawing(detection);
      const legTrait = traits.find(t => t.category === 'legs');

      expect(legTrait?.statement).toContain('major period of change');
      expect(legTrait?.evidence.key).toBe('legs=0');
    });
  });

  describe('Ear Size Analysis', () => {
    test('should identify large ears (good listener)', () => {
      const detection = createMockDetection({
        head: { boundingBox: { x: 150, y: 100, width: 100, height: 80 }, confidence: 0.9 },
        ears: [
          { boundingBox: { x: 150, y: 90, width: 25, height: 40 }, confidence: 0.8 }, // 50% of head height
          { boundingBox: { x: 225, y: 90, width: 25, height: 40 }, confidence: 0.8 },
        ],
      });

      const traits = analyzePigDrawing(detection);
      const earTrait = traits.find(t => t.category === 'ears');

      expect(earTrait?.statement).toContain('good listener');
      expect(earTrait?.evidence.key).toContain('Large');
    });

    test('should handle no ears', () => {
      const detection = createMockDetection({
        ears: [],
      });

      const traits = analyzePigDrawing(detection);
      const earTrait = traits.find(t => t.category === 'ears');

      expect(earTrait).toBeUndefined();
    });
  });

  describe('Tail Length Analysis', () => {
    test('should identify long tail (intelligence)', () => {
      const detection = createMockDetection({
        body: { boundingBox: { x: 100, y: 150, width: 200, height: 150 }, confidence: 0.95 },
        tail: { boundingBox: { x: 300, y: 200, width: 120, height: 20 }, confidence: 0.75 }, // 60% of body width
      });

      const traits = analyzePigDrawing(detection);
      const tailTrait = traits.find(t => t.category === 'tail');

      expect(tailTrait?.statement).toContain('intelligence');
      expect(tailTrait?.evidence.key).toContain('Long');
    });

    test('should handle no tail', () => {
      const detection = createMockDetection({
        tail: undefined,
      });

      const traits = analyzePigDrawing(detection);
      const tailTrait = traits.find(t => t.category === 'tail');

      expect(tailTrait).toBeUndefined();
    });
  });

  describe('Summary Generation', () => {
    test('should generate summary for single trait', () => {
      const traits = [
        {
          category: 'placement' as const,
          statement: 'tendency to be positive and optimistic.',
          evidence: { key: 'placement=Top', value: 0.2 },
        },
      ];

      const summary = generateSummary(traits);
      expect(summary).toContain('tendency to be positive and optimistic');
    });

    test('should generate summary for multiple traits', () => {
      const traits = [
        {
          category: 'placement' as const,
          statement: 'tendency to be positive and optimistic.',
          evidence: { key: 'placement=Top', value: 0.2 },
        },
        {
          category: 'details' as const,
          statement: 'analytical; may be cautious and struggle with trust.',
          evidence: { key: 'details=Many', value: 10 },
        },
      ];

      const summary = generateSummary(traits);
      expect(summary).toContain('tendency to be positive and optimistic');
      expect(summary).toContain('analytical');
    });

    test('should handle no traits', () => {
      const summary = generateSummary([]);
      expect(summary).toContain('Unable to analyze');
    });
  });

  describe('Orientation Analysis', () => {
    test('should identify left-facing pig', () => {
      const detection = createMockDetection({
        head: { boundingBox: { x: 100, y: 150, width: 80, height: 70 }, confidence: 0.9 },
        body: { boundingBox: { x: 150, y: 140, width: 150, height: 120 }, confidence: 0.95 },
      });

      const traits = analyzePigDrawing(detection);
      const orientationTrait = traits.find(t => t.category === 'orientation');

      expect(orientationTrait).toBeDefined();
      expect(orientationTrait?.statement).toContain('believe in tradition');
      expect(orientationTrait?.evidence.key).toContain('Left');
    });

    test('should identify right-facing pig', () => {
      const detection = createMockDetection({
        head: { boundingBox: { x: 250, y: 150, width: 80, height: 70 }, confidence: 0.9 },
        body: { boundingBox: { x: 100, y: 140, width: 150, height: 120 }, confidence: 0.95 },
      });

      const traits = analyzePigDrawing(detection);
      const orientationTrait = traits.find(t => t.category === 'orientation');

      expect(orientationTrait?.statement).toContain('innovative and active');
      expect(orientationTrait?.evidence.key).toContain('Right');
    });

    test('should identify front-facing pig', () => {
      const detection = createMockDetection({
        head: { boundingBox: { x: 150, y: 140, width: 80, height: 70 }, confidence: 0.9 },
        body: { boundingBox: { x: 140, y: 150, width: 100, height: 100 }, confidence: 0.95 },
      });

      const traits = analyzePigDrawing(detection);
      const orientationTrait = traits.find(t => t.category === 'orientation');

      expect(orientationTrait?.statement).toContain('direct');
      expect(orientationTrait?.evidence.key).toContain('Front');
    });

    test('should default to front-facing when head is missing', () => {
      const detection = createMockDetection({
        head: undefined,
        body: { boundingBox: { x: 100, y: 150, width: 150, height: 120 }, confidence: 0.95 },
      });

      const traits = analyzePigDrawing(detection);
      const orientationTrait = traits.find(t => t.category === 'orientation');

      expect(orientationTrait?.statement).toContain('direct');
    });

    test('should use ears for orientation when head and body missing', () => {
      const detection = createMockDetection({
        head: undefined,
        body: undefined,
        ears: [
          { boundingBox: { x: 120, y: 100, width: 20, height: 30 }, confidence: 0.8 },
          { boundingBox: { x: 160, y: 100, width: 20, height: 30 }, confidence: 0.8 },
        ],
      });

      const traits = analyzePigDrawing(detection);
      const orientationTrait = traits.find(t => t.category === 'orientation');

      expect(orientationTrait).toBeDefined();
      expect(orientationTrait?.evidence.key).toContain('Front');
    });
  });

  describe('Tail Analysis Edge Cases', () => {
    test('should not return trait for short tail below threshold', () => {
      const detection = createMockDetection({
        body: { boundingBox: { x: 100, y: 150, width: 200, height: 150 }, confidence: 0.95 },
        tail: { boundingBox: { x: 300, y: 200, width: 40, height: 15 }, confidence: 0.75 }, // 20% - below 40% threshold
      });

      const traits = analyzePigDrawing(detection);
      const tailTrait = traits.find(t => t.category === 'tail');

      // Tail is below threshold, should not return a trait
      expect(tailTrait).toBeUndefined();
    });

    test('should use absolute measurement when body is missing', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 100, y: 150, width: 200, height: 150 },
          canvas: { width: 500, height: 500 },
        },
        body: undefined,
        tail: { boundingBox: { x: 300, y: 200, width: 100, height: 20 }, confidence: 0.75 }, // 20% of canvas
      });

      const traits = analyzePigDrawing(detection);
      const tailTrait = traits.find(t => t.category === 'tail');

      // With large enough tail (>15% of canvas), should return trait
      expect(tailTrait).toBeDefined();
      expect(tailTrait?.statement).toContain('intelligence');
    });
  });

  describe('Ear Analysis Edge Cases', () => {
    test('should not return trait for small ears below threshold', () => {
      const detection = createMockDetection({
        head: { boundingBox: { x: 150, y: 100, width: 100, height: 80 }, confidence: 0.9 },
        ears: [
          { boundingBox: { x: 150, y: 95, width: 15, height: 20 }, confidence: 0.8 }, // 25% - below 30% threshold
          { boundingBox: { x: 235, y: 95, width: 15, height: 20 }, confidence: 0.8 },
        ],
      });

      const traits = analyzePigDrawing(detection);
      const earTrait = traits.find(t => t.category === 'ears');

      // Ears are below threshold, should not return a trait
      expect(earTrait).toBeUndefined();
    });

    test('should skip ear analysis when head is missing', () => {
      const detection = createMockDetection({
        head: undefined,
        ears: [
          { boundingBox: { x: 150, y: 95, width: 25, height: 40 }, confidence: 0.8 },
        ],
      });

      const traits = analyzePigDrawing(detection);
      const earTrait = traits.find(t => t.category === 'ears');

      expect(earTrait).toBeUndefined();
    });

    test('should handle single ear', () => {
      const detection = createMockDetection({
        head: { boundingBox: { x: 150, y: 100, width: 100, height: 80 }, confidence: 0.9 },
        ears: [
          { boundingBox: { x: 150, y: 90, width: 25, height: 40 }, confidence: 0.8 },
        ],
      });

      const traits = analyzePigDrawing(detection);
      const earTrait = traits.find(t => t.category === 'ears');

      expect(earTrait).toBeDefined();
    });
  });

  describe('Comprehensive Integration Tests', () => {
    test('should analyze complete pig drawing with all features', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 100, y: 150, width: 300, height: 200 },
          canvas: { width: 600, height: 600 },
        },
        head: { boundingBox: { x: 250, y: 160, width: 90, height: 80 }, confidence: 0.92 },
        body: { boundingBox: { x: 120, y: 180, width: 180, height: 140 }, confidence: 0.95 },
        legs: [
          { boundingBox: { x: 130, y: 300, width: 30, height: 70 }, confidence: 0.88 },
          { boundingBox: { x: 180, y: 300, width: 30, height: 70 }, confidence: 0.87 },
          { boundingBox: { x: 230, y: 300, width: 30, height: 70 }, confidence: 0.89 },
          { boundingBox: { x: 270, y: 300, width: 30, height: 70 }, confidence: 0.86 },
        ],
        ears: [
          { boundingBox: { x: 250, y: 150, width: 25, height: 45 }, confidence: 0.84 },
          { boundingBox: { x: 315, y: 150, width: 25, height: 45 }, confidence: 0.83 },
        ],
        tail: { boundingBox: { x: 300, y: 220, width: 100, height: 25 }, confidence: 0.79 },
        detailCount: 12,
      });

      const traits = analyzePigDrawing(detection);

      // Should have traits from all categories
      expect(traits.find(t => t.category === 'placement')).toBeDefined();
      expect(traits.find(t => t.category === 'orientation')).toBeDefined();
      expect(traits.find(t => t.category === 'details')).toBeDefined();
      expect(traits.find(t => t.category === 'legs')).toBeDefined();
      expect(traits.find(t => t.category === 'ears')).toBeDefined();
      expect(traits.find(t => t.category === 'tail')).toBeDefined();

      // Should have at least 6 traits
      expect(traits.length).toBeGreaterThanOrEqual(6);

      // Summary should be comprehensive
      const summary = generateSummary(traits);
      expect(summary.length).toBeGreaterThan(100);
    });

    test('should analyze minimalist pig drawing', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 200, y: 400, width: 150, height: 80 },
          canvas: { width: 600, height: 600 },
        },
        detailCount: 2,
        legs: [],
        ears: [],
        tail: undefined,
      });

      const traits = analyzePigDrawing(detection);

      // Should at least have placement and detail traits
      expect(traits.find(t => t.category === 'placement')).toBeDefined();
      expect(traits.find(t => t.category === 'details')).toBeDefined();
      expect(traits.find(t => t.category === 'orientation')).toBeDefined();

      // Should not have optional traits
      expect(traits.find(t => t.category === 'legs')).toBeDefined(); // Even with 0 legs
      expect(traits.find(t => t.category === 'ears')).toBeUndefined();
      expect(traits.find(t => t.category === 'tail')).toBeUndefined();
    });
  });

  describe('Boundary Value Tests', () => {
    test('should handle pig at exact top threshold', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 100, y: 165, width: 200, height: 150 }, // Exactly at 0.33
          canvas: { width: 500, height: 500 },
        },
      });

      const traits = analyzePigDrawing(detection);
      const placementTrait = traits.find(t => t.category === 'placement');

      expect(placementTrait).toBeDefined();
    });

    test('should handle pig at exact bottom threshold', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 100, y: 335, width: 200, height: 150 }, // Exactly at 0.67
          canvas: { width: 500, height: 500 },
        },
      });

      const traits = analyzePigDrawing(detection);
      const placementTrait = traits.find(t => t.category === 'placement');

      expect(placementTrait).toBeDefined();
    });

    test('should handle exactly 5 details (threshold)', () => {
      const detection = createMockDetection({
        detailCount: 5,
      });

      const traits = analyzePigDrawing(detection);
      const detailTrait = traits.find(t => t.category === 'details');

      expect(detailTrait).toBeDefined();
    });

    test('should handle exactly 6 details (just above threshold)', () => {
      const detection = createMockDetection({
        detailCount: 6,
      });

      const traits = analyzePigDrawing(detection);
      const detailTrait = traits.find(t => t.category === 'details');

      expect(detailTrait?.evidence.key).toContain('Many');
    });

    test('should not return trait for ears at exact size threshold', () => {
      const detection = createMockDetection({
        head: { boundingBox: { x: 150, y: 100, width: 100, height: 100 }, confidence: 0.9 },
        ears: [
          { boundingBox: { x: 150, y: 90, width: 20, height: 30 }, confidence: 0.8 }, // Exactly 0.3 (30%)
        ],
      });

      const traits = analyzePigDrawing(detection);
      const earTrait = traits.find(t => t.category === 'ears');

      // At threshold (not greater than), should not return trait
      expect(earTrait).toBeUndefined();
    });

    test('should not return trait for tail at exact length threshold', () => {
      const detection = createMockDetection({
        body: { boundingBox: { x: 100, y: 150, width: 200, height: 150 }, confidence: 0.95 },
        tail: { boundingBox: { x: 300, y: 200, width: 80, height: 20 }, confidence: 0.75 }, // Exactly 0.4 (40%)
      });

      const traits = analyzePigDrawing(detection);
      const tailTrait = traits.find(t => t.category === 'tail');

      // At threshold (not greater than), should not return trait
      expect(tailTrait).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle minimal detection data', () => {
      const detection: Detection = {
        overall: {
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          canvas: { width: 500, height: 500 },
        },
        detailCount: 1,
        legs: [],
        ears: [],
      };

      const traits = analyzePigDrawing(detection);
      expect(traits.length).toBeGreaterThan(0); // Should at least have placement and detail traits
    });

    test('should handle very small canvas', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 5, y: 5, width: 40, height: 30 },
          canvas: { width: 50, height: 50 },
        },
      });

      const traits = analyzePigDrawing(detection);
      expect(traits.length).toBeGreaterThan(0);
    });

    test('should handle very large detailCount', () => {
      const detection = createMockDetection({
        detailCount: 100,
      });

      const traits = analyzePigDrawing(detection);
      const detailTrait = traits.find(t => t.category === 'details');

      expect(detailTrait?.evidence.key).toContain('Many');
    });

    test('should handle zero-width bounding box', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 100, y: 200, width: 0, height: 100 },
          canvas: { width: 500, height: 500 },
        },
      });

      const traits = analyzePigDrawing(detection);
      expect(traits.length).toBeGreaterThan(0);
    });

    test('should handle square canvas', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 250, y: 250, width: 100, height: 100 }, // Center y=300, canvas height=1000, ratio=0.3
          canvas: { width: 1000, height: 1000 },
        },
      });

      const traits = analyzePigDrawing(detection);
      const placementTrait = traits.find(t => t.category === 'placement');

      expect(placementTrait).toBeDefined();
      // Center at 0.3 is in top third (<0.33)
      expect(placementTrait?.evidence.key).toContain('Top');
    });

    test('should handle negative coordinates gracefully', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: -10, y: -10, width: 100, height: 100 },
          canvas: { width: 500, height: 500 },
        },
      });

      const traits = analyzePigDrawing(detection);
      expect(traits.length).toBeGreaterThan(0);
    });

    test('should handle pig larger than canvas', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 0, y: 0, width: 1000, height: 1000 },
          canvas: { width: 500, height: 500 },
        },
      });

      const traits = analyzePigDrawing(detection);
      expect(traits.length).toBeGreaterThan(0);
    });

    test('should handle more than 4 legs', () => {
      const detection = createMockDetection({
        legs: [
          { boundingBox: { x: 120, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 160, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 200, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 240, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 280, y: 280, width: 30, height: 60 }, confidence: 0.85 },
        ],
      });

      const traits = analyzePigDrawing(detection);
      const legTrait = traits.find(t => t.category === 'legs');

      expect(legTrait).toBeDefined();
      expect(legTrait?.evidence.key).toBe('legs=5');
    });
  });

  describe('Pig Validation', () => {
    test('should identify valid pig description', () => {
      expect(isPigDescription('The drawing is a simple, cartoon-style depiction of a pig.')).toBe(true);
    });

    test('should identify pig with keyword variations', () => {
      expect(isPigDescription('A drawing of a piglet with four legs')).toBe(true);
      expect(isPigDescription('This is a porcine animal')).toBe(true);
      expect(isPigDescription('A swine with a curly tail')).toBe(true);
      expect(isPigDescription('Drawing of a hog')).toBe(true);
    });

    test('should identify pig by anatomy keywords', () => {
      expect(isPigDescription('An animal with a large snout and four legs')).toBe(true);
      expect(isPigDescription('Drawing with a curly tail')).toBe(true);
      expect(isPigDescription('Animal with trotters')).toBe(true);
    });

    test('should reject non-pig animals', () => {
      expect(isPigDescription('A drawing of a dog with four legs')).toBe(false);
      expect(isPigDescription('A photograph of a cat sitting on a couch')).toBe(false);
      expect(isPigDescription('A horse standing in a field')).toBe(false);
      expect(isPigDescription('A drawing of a bird')).toBe(false);
    });

    test('should reject non-animal drawings', () => {
      expect(isPigDescription('A drawing of a house')).toBe(false);
      expect(isPigDescription('A photograph of a tree')).toBe(false);
      expect(isPigDescription('Abstract art with geometric shapes')).toBe(false);
    });

    test('should handle empty or undefined input', () => {
      expect(isPigDescription('')).toBe(false);
      expect(isPigDescription(undefined)).toBe(false);
    });

    test('should be case insensitive', () => {
      expect(isPigDescription('A PIG drawing')).toBe(true);
      expect(isPigDescription('DRAWING OF A HOG')).toBe(true);
      expect(isPigDescription('Swine with SNOUT')).toBe(true);
    });
  });

  describe('Custom Analyzer Direct Values', () => {
    test('should use direct verticalPlacement value when available', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          canvas: { width: 500, height: 500 },
        },
      });
      
      // Add direct value from custom analyzer
      (detection as any).verticalPlacement = 'Bottom';

      const traits = analyzePigDrawing(detection);
      const placementTrait = traits.find(t => t.category === 'placement');

      expect(placementTrait?.evidence.key).toBe('placement=Bottom');
      expect(placementTrait?.statement).toContain('pessimistic');
    });

    test('should use direct orientation value when available', () => {
      const detection = createMockDetection();
      
      // Add direct value from custom analyzer
      (detection as any).orientation = 'Right';

      const traits = analyzePigDrawing(detection);
      const orientationTrait = traits.find(t => t.category === 'orientation');

      expect(orientationTrait?.evidence.key).toBe('orientation=Right');
      expect(orientationTrait?.statement).toContain('innovative');
    });

    test('should use direct legCount value when available', () => {
      const detection = createMockDetection({
        legs: [], // Empty array
      });
      
      // Add direct value from custom analyzer
      (detection as any).legCount = 4;

      const traits = analyzePigDrawing(detection);
      const legTrait = traits.find(t => t.category === 'legs');

      expect(legTrait?.evidence.key).toBe('legs=4');
      expect(legTrait?.statement).toContain('secure');
    });

    test('should use direct earSize value when available', () => {
      const detection = createMockDetection({
        ears: [], // No ears detected
      });
      
      // Add direct value from custom analyzer
      (detection as any).earSize = 'Large';

      const traits = analyzePigDrawing(detection);
      const earTrait = traits.find(t => t.category === 'ears');

      expect(earTrait?.evidence.key).toBe('ears=Large');
      expect(earTrait?.statement).toContain('good listener');
    });

    test('should not return ear trait for Normal ear size', () => {
      const detection = createMockDetection();
      
      // Add direct value from custom analyzer
      (detection as any).earSize = 'Normal';

      const traits = analyzePigDrawing(detection);
      const earTrait = traits.find(t => t.category === 'ears');

      expect(earTrait).toBeUndefined();
    });

    test('should use direct tailLength value when available', () => {
      const detection = createMockDetection({
        tail: undefined, // No tail detected
      });
      
      // Add direct value from custom analyzer (above 0.4 threshold)
      (detection as any).tailLength = 0.6;

      const traits = analyzePigDrawing(detection);
      const tailTrait = traits.find(t => t.category === 'tail');

      expect(tailTrait?.evidence.key).toBe('tail=Long');
      expect(tailTrait?.evidence.value).toBe(0.6);
      expect(tailTrait?.statement).toContain('intelligence');
    });

    test('should not return tail trait for short tail length', () => {
      const detection = createMockDetection();
      
      // Add direct value from custom analyzer (below 0.4 threshold)
      (detection as any).tailLength = 0.3;

      const traits = analyzePigDrawing(detection);
      const tailTrait = traits.find(t => t.category === 'tail');

      expect(tailTrait).toBeUndefined();
    });

    test('should handle all custom analyzer values together', () => {
      const detection = createMockDetection({
        detailCount: 0,
      });
      
      // Add all direct values from custom analyzer
      (detection as any).verticalPlacement = 'Top';
      (detection as any).orientation = 'Left';
      (detection as any).legCount = 4;
      (detection as any).earSize = 'Large';
      (detection as any).tailLength = 0.5;

      const traits = analyzePigDrawing(detection);

      expect(traits.find(t => t.category === 'placement')?.evidence.key).toBe('placement=Top');
      expect(traits.find(t => t.category === 'orientation')?.evidence.key).toBe('orientation=Left');
      expect(traits.find(t => t.category === 'legs')?.evidence.key).toBe('legs=4');
      expect(traits.find(t => t.category === 'ears')?.evidence.key).toBe('ears=Large');
      expect(traits.find(t => t.category === 'tail')?.evidence.key).toBe('tail=Long');
      expect(traits.length).toBe(6); // All 6 traits present
    });

    test('should fallback to bounding box calculation when direct values missing', () => {
      const detection = createMockDetection({
        overall: {
          boundingBox: { x: 100, y: 50, width: 200, height: 150 },
          canvas: { width: 500, height: 500 },
        },
        head: { boundingBox: { x: 250, y: 150, width: 80, height: 70 }, confidence: 0.9 },
        body: { boundingBox: { x: 100, y: 140, width: 150, height: 120 }, confidence: 0.95 },
        legs: [
          { boundingBox: { x: 120, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 170, y: 280, width: 30, height: 60 }, confidence: 0.85 },
          { boundingBox: { x: 220, y: 280, width: 30, height: 60 }, confidence: 0.85 },
        ],
      });
      
      // No custom analyzer values added

      const traits = analyzePigDrawing(detection);

      // Should still calculate traits from bounding boxes
      expect(traits.find(t => t.category === 'placement')).toBeDefined();
      expect(traits.find(t => t.category === 'orientation')).toBeDefined();
      expect(traits.find(t => t.category === 'legs')).toBeDefined();
      expect(traits.length).toBeGreaterThan(0);
    });
  });
});
