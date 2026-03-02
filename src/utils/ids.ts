let counter = 0;

export function resetIdCounter(): void {
  counter = 0;
}

export function nextId(): string {
  counter++;
  return `obj-${counter}`;
}
