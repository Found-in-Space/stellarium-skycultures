import orionUrl from '@found-in-space/stellarium-skycultures-western/illustrations/orion.webp';

if (!orionUrl) {
  throw new Error('Orion artwork URL was not emitted.');
}

console.log(orionUrl);
