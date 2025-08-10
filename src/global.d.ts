declare module '*.css';

// Map vis-network standalone build to core types if TS can't resolve the subpath types
declare module 'vis-network/standalone' {
  export * from 'vis-network';
}
