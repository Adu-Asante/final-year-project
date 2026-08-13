// src/core/entities/Phrase.ts
// Domain entity for offline phrasebook entries

export type PhraseCategory =
  | 'greetings'
  | 'hospital'
  | 'food'
  | 'police'
  | 'travel'
  | 'shopping'
  | 'emergency'
  | 'numbers'
  | 'family'
  | 'directions'
  | 'time'
  | 'slang'
  | 'business';

export interface CategoryMeta {
  id: PhraseCategory;
  label: string;
  emoji: string;
  color: string;
  iconName: string;
}

export const PHRASE_CATEGORIES: CategoryMeta[] = [
  { id: 'greetings',  label: 'Greetings',           emoji: '', color: '#7C5CBF', iconName: 'hand-left-outline' },
  { id: 'hospital',   label: 'Medical & Hospital',  emoji: '', color: '#E05C5C', iconName: 'medical-outline' },
  { id: 'food',       label: 'Food & Dining',       emoji: '', color: '#E08A3C', iconName: 'restaurant-outline' },
  { id: 'police',     label: 'Police & Safety',     emoji: '', color: '#3C8AE0', iconName: 'shield-checkmark-outline' },
  { id: 'travel',     label: 'Travel & Transport',  emoji: '', color: '#3CAE3C', iconName: 'bus-outline' },
  { id: 'shopping',   label: 'Shopping',            emoji: '', color: '#E0C83C', iconName: 'cart-outline' },
  { id: 'emergency',  label: 'Emergency',           emoji: '', color: '#E03C3C', iconName: 'warning-outline' },
  { id: 'numbers',    label: 'Numbers',             emoji: '', color: '#3CE0C8', iconName: 'calculator-outline' },
  { id: 'family',     label: 'Family & People',     emoji: '', color: '#EC4899', iconName: 'people-outline' },
  { id: 'directions', label: 'Directions',          emoji: '', color: '#8B5CF6', iconName: 'compass-outline' },
  { id: 'time',       label: 'Time & Dates',        emoji: '', color: '#F59E0B', iconName: 'time-outline' },
  { id: 'slang',      label: 'Common Expressions',  emoji: '', color: '#10B981', iconName: 'chatbubbles-outline' },
  { id: 'business',   label: 'Business & Work',     emoji: '', color: '#6366F1', iconName: 'briefcase-outline' },
];

export interface Phrase {
  id: string;
  category: PhraseCategory;
  twiText: string;
  englishText: string;
  audioUri?: string;   // Pre-recorded Twi pronunciation (optional)
  usageCount: number;
}
