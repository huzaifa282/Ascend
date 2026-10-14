import { ulid } from 'ulid';

/** Every table's `id` is a ULID (spec section 4: lexically sortable by creation time). */
export function newId(): string {
  return ulid();
}
