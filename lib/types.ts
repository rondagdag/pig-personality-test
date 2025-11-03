/**
 * Core type definitions for Draw the Pig Personality Test
 */

// Azure Content Understanding Response Types
export interface AzureAnalyzerResponse {
  status: 'Running' | 'NotStarted' | 'Succeeded' | 'Failed';
  result?: {
    analyzerId?: string;
    apiVersion?: string;
    createdAt?: string;
    warnings?: any[];
    contents?: Array<{
      markdown?: string;
      kind?: string;
      startPageNumber?: number;
      endPageNumber?: number;
      unit?: string;
      pages?: Array<{
        pageNumber: number;
        spans: any[];
      }>;
      fields?: {
        Summary?: {
          type: string;
          valueString: string;
        };
        [key: string]: any;
      };
      sections?: Array<{
        elements?: Array<{
          kind: string;
          boundingRegions?: Array<{
            pageNumber?: number;
            polygon?: number[];
          }>;
          regions?: Array<{
            category?: string;
            boundingBox?: BoundingBox;
            confidence?: number;
          }>;
        }>;
      }>;
    }>;
    // Image analyzer specific fields
    description?: {
      captions?: Array<{
        text: string;
        confidence: number;
      }>;
      tags?: string[];
    };
    objects?: Array<{
      category: string;
      boundingBox: BoundingBox;
      confidence: number;
    }>;
    tags?: Array<{
      name: string;
      confidence: number;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Internal Detection Model
export interface Detection {
  head?: DetectionRegion;
  body?: DetectionRegion;
  legs?: DetectionRegion[];
  ears?: DetectionRegion[];
  tail?: DetectionRegion;
  overall: {
    boundingBox: BoundingBox;
    canvas: {
      width: number;
      height: number;
    };
  };
  detailCount: number; // Total number of distinct parts detected
  description?: string; // AI-generated image description from Content Understanding
  descriptionConfidence?: number; // Confidence score for the description
}

export interface DetectionRegion {
  boundingBox: BoundingBox;
  confidence: number;
  category?: string;
}

// Personality Analysis Types
export interface PersonalityTrait {
  category: 'placement' | 'orientation' | 'details' | 'legs' | 'ears' | 'tail';
  statement: string;
  evidence: Evidence;
}

export interface Evidence {
  key: string; // e.g., "placement=Top", "orientation=Left"
  value: string | number;
  confidence?: number;
}

export interface AnalysisResult {
  id: string;
  imageUrl?: string;
  traits: PersonalityTrait[];
  summary: string;
  createdAt: string;
  description?: string; // AI-generated image description
  descriptionConfidence?: number;
  metadata?: {
    detectionCount: number;
    processingTimeMs: number;
  };
}

// API Request/Response Types
export interface AnalyzeRequest {
  imageBase64?: string;
  blobUrl?: string;
  participantName?: string; // For group mode
}

export interface AnalyzeResponse {
  id: string;
  summary: string;
  evidence: Evidence[];
  tallies?: PlacementTallies;
}

export interface PlacementTallies {
  placement: {
    top: number;
    middle: number;
    bottom: number;
  };
  orientation: {
    left: number;
    right: number;
    front: number;
  };
  details: {
    many: number;
    few: number;
  };
  legs: {
    lessThanFour: number;
    four: number;
  };
}

// Group Analysis Types
export interface GroupParticipant {
  id: string;
  name: string;
  placement: 'Top' | 'Middle' | 'Bottom';
  orientation: 'Left' | 'Right' | 'Front';
  legs: number;
  detailLevel: 'Many' | 'Few';
  traits: string[];
  imageUrl?: string;
}

export interface GroupAnalysis {
  participants: GroupParticipant[];
  tallies: PlacementTallies;
  discussionPrompts: string[];
}

// Admin Export Types
export type ExportFormat = 'csv' | 'json';

export interface ExportData {
  results: AnalysisResult[];
  exportedAt: string;
  totalCount: number;
}

// Rule Engine Types
export interface PigRule {
  condition: (detection: Detection) => boolean;
  trait: Omit<PersonalityTrait, 'evidence'>;
  extractEvidence: (detection: Detection) => Evidence;
}

// Storage Types
export interface StorageUploadResult {
  url: string;
  blobName: string;
  expiresAt: Date;
}
