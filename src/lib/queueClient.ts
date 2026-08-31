import { supabase } from './supabase';
import type { SearchResult, AddedFrom } from '../types';

// All writes go through RPCs rather than raw table access — RLS denies
// direct insert/update/delete, so this is the only path that works.

export async function addToQueue(
  item: SearchResult,
  addedBy: string,
  addedFrom: AddedFrom
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('add_to_queue_item', {
    p_source: item.source,
    p_source_id: item.sourceId,
    p_title: item.title,
    p_artist: item.artist,
    p_thumbnail_url: item.thumbnailUrl,
    p_duration_seconds: item.durationSeconds,
    p_added_by: addedBy,
    p_added_from: addedFrom,
  });
  return { error: error?.message };
}

export async function removeOwnQueueItem(itemId: string, addedBy: string) {
  await supabase.rpc('remove_own_queue_item', { p_item_id: itemId, p_added_by: addedBy });
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const { data } = await supabase.rpc('verify_admin_pin', { input_pin: pin });
  return Boolean(data);
}

export async function adminRemoveQueueItem(itemId: string, pin: string) {
  await supabase.rpc('admin_remove_queue_item', { p_item_id: itemId, p_pin: pin });
}

export async function adminReorderQueueItem(itemId: string, newPosition: number, pin: string) {
  await supabase.rpc('admin_reorder_queue_item', {
    p_item_id: itemId,
    p_new_position: newPosition,
    p_pin: pin,
  });
}

export async function adminSkip(pin: string) {
  await supabase.rpc('admin_skip', { p_pin: pin });
}
