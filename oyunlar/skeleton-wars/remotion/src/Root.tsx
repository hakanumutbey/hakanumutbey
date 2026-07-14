import React from 'react';
import {Composition} from 'remotion';
import {SkeletonWarsIntro} from './SkeletonWarsIntro';

export const Root: React.FC = () => {
  return (
    <Composition
      id="SkeletonWarsIntro"
      component={SkeletonWarsIntro}
      durationInFrames={360}
      fps={30}
      width={960}
      height={540}
    />
  );
};
