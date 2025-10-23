import { analyzePigDrawing, generateSummary, createMockDetection } from '@/lib/scoring/pigRules';
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

      expect(earTrait).toBeNull();
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

      expect(tailTrait).toBeNull();
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
  });
});
