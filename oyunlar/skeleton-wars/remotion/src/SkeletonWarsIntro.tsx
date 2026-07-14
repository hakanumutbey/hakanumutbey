import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

export const SkeletonWarsIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const scene = Math.min(3, Math.floor(frame / 90));
  const local = frame % 90;
  const fade = Math.min(
    interpolate(local, [0, 10], [0, 1], {extrapolateRight: 'clamp'}),
    interpolate(local, [78, 90], [1, 0], {extrapolateLeft: 'clamp'}),
  );
  const shiver = Math.sin(frame * 1.4) * 4;
  const handX = interpolate(frame, [230, 300], [1080, 650], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shake = frame > 285 ? Math.sin(frame * 3.2) * 10 : 0;

  return (
    <AbsoluteFill style={{backgroundColor: '#10140f', fontFamily: 'Arial'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${shake}px, ${-shake * 0.35}px)`}}>
        <Background scene={scene} />
        <Tent />
        <Fire frame={frame} />
        <Hero x={360} y={345 + shiver} color="#486de0" />
        <Hero x={455} y={347 - shiver} color="#8ac05d" />
        {scene >= 1 && <Skeletons opacity={fade} />}
        {scene === 2 && <Money opacity={fade} />}
        {scene >= 3 && <GiantHand x={handX} y={225} />}
      </div>

      {scene === 0 && (
        <>
          <Bubble x={230} y={115} text="Buraya geldigimiz iyi oldu ama donuyoz." opacity={fade} />
          <Bubble x={500} y={145} text="Harbi ya." opacity={fade} />
        </>
      )}
      {scene === 1 && (
        <>
          <Bubble x={220} y={110} text="Hani iskeletler gercek degildi?" opacity={fade} />
          <Bubble x={470} y={145} text="Iddiayi ben kazandim." opacity={fade} />
        </>
      )}
      {scene === 2 && (
        <>
          <Bubble x={230} y={105} text="100 lirami ver." opacity={fade} />
          <Bubble x={480} y={150} text="Al su yuz lirayi." opacity={fade} />
        </>
      )}
      {scene === 3 && (
        <>
          <Bubble x={170} y={100} text="Iyi de bizi eline aldi!" opacity={fade} />
          <Bubble x={480} y={135} text="Korkma... galiba." opacity={fade} />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 58,
              textAlign: 'center',
              color: '#ffd36b',
              fontSize: 44,
              fontWeight: 900,
              opacity: fade,
              textShadow: '0 5px 0 #2a1609',
            }}
          >
            AAAAAAAAA! YARDIM EDIN!
          </div>
        </>
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 26,
          textAlign: 'center',
          color: '#ffd36b',
          fontSize: 42,
          fontWeight: 900,
          textShadow: '0 4px 0 #2a1609',
          opacity: interpolate(frame, [315, 350], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        Skeleton Wars
      </div>
    </AbsoluteFill>
  );
};

const Background: React.FC<{scene: number}> = ({scene}) => (
  <>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: scene >= 1
          ? 'linear-gradient(180deg, #12121a, #21311d)'
          : 'linear-gradient(180deg, #172438, #1d3a23)',
      }}
    />
    <div style={{position: 'absolute', right: 118, top: 42, width: 70, height: 70, borderRadius: 40, background: '#f3e9bd', boxShadow: '0 0 50px rgba(243,233,189,.5)'}} />
    {Array.from({length: 16}).map((_, i) => (
      <div key={i}>
        <div style={{position: 'absolute', left: i * 72 - 28, top: 260 + (i % 4) * 24, width: 14, height: 96, background: '#4b301c'}} />
        <div style={{position: 'absolute', left: i * 72 - 56, top: 210 + (i % 4) * 24, width: 72, height: 82, borderRadius: 44, background: i % 2 ? '#1d5a32' : '#246438'}} />
      </div>
    ))}
    <div style={{position: 'absolute', left: 50, top: 385, width: 870, height: 70, borderRadius: 60, background: '#9a7a43', transform: 'rotate(-4deg)'}} />
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 55%, transparent 0%, transparent 48%, rgba(0,0,0,.55) 100%)'}} />
  </>
);

const Tent: React.FC = () => (
  <div>
    <div style={{position: 'absolute', left: 78, top: 330, width: 160, height: 48, background: '#47301c'}} />
    <div style={{position: 'absolute', left: 92, top: 240, width: 0, height: 0, borderLeft: '72px solid transparent', borderRight: '72px solid transparent', borderBottom: '100px solid #b44b37'}} />
  </div>
);

const Fire: React.FC<{frame: number}> = ({frame}) => (
  <div>
    <div style={{position: 'absolute', left: 548, top: 332, width: 100, height: 100, borderRadius: 60, background: 'radial-gradient(circle, rgba(255,211,107,.45), transparent 70%)'}} />
    <div style={{position: 'absolute', left: 578, top: 392, width: 68, height: 10, background: '#7b3d20'}} />
    <div style={{position: 'absolute', left: 592, top: 328 + Math.sin(frame * 0.4) * 8, width: 0, height: 0, borderLeft: '26px solid transparent', borderRight: '26px solid transparent', borderBottom: '76px solid #ffd36b'}} />
    <div style={{position: 'absolute', left: 604, top: 360, width: 0, height: 0, borderLeft: '16px solid transparent', borderRight: '16px solid transparent', borderBottom: '45px solid #e15b4f'}} />
  </div>
);

const Hero: React.FC<{x: number; y: number; color: string}> = ({x, y, color}) => (
  <div>
    <div style={{position: 'absolute', left: x - 24, top: y - 10, width: 48, height: 52, borderRadius: 26, background: color, boxShadow: 'inset -8px -8px 0 rgba(0,0,0,.18)'}} />
    <div style={{position: 'absolute', left: x - 12, top: y - 42, width: 24, height: 22, borderRadius: 5, background: '#f0c46a'}} />
    <div style={{position: 'absolute', left: x - 24, top: y + 40, width: 10, height: 42, background: '#f0c46a', transform: 'rotate(15deg)'}} />
    <div style={{position: 'absolute', left: x + 14, top: y + 40, width: 10, height: 42, background: '#f0c46a', transform: 'rotate(-15deg)'}} />
  </div>
);

const Skeletons: React.FC<{opacity: number}> = ({opacity}) => (
  <>
    {Array.from({length: 5}).map((_, i) => (
      <div key={i} style={{opacity}}>
        <div style={{position: 'absolute', left: 660 + i * 45, top: 285 + (i % 2) * 38, width: 34, height: 34, borderRadius: 20, background: '#ece7d4'}} />
        <div style={{position: 'absolute', left: 675 + i * 45, top: 318 + (i % 2) * 38, width: 5, height: 58, background: '#ece7d4'}} />
        <div style={{position: 'absolute', left: 654 + i * 45, top: 340 + (i % 2) * 38, width: 48, height: 6, background: '#ece7d4'}} />
      </div>
    ))}
  </>
);

const Money: React.FC<{opacity: number}> = ({opacity}) => (
  <div style={{position: 'absolute', left: 420, top: 300, width: 82, height: 42, borderRadius: 7, background: '#6fcf67', border: '5px solid #d9ffd1', opacity, transform: `rotate(${interpolate(opacity, [0, 1], [-35, 8])}deg)`}} />
);

const GiantHand: React.FC<{x: number; y: number}> = ({x, y}) => (
  <div>
    <div style={{position: 'absolute', left: x, top: y, width: 210, height: 130, borderRadius: 65, background: '#ece7d4', boxShadow: 'inset -18px -18px 0 rgba(0,0,0,.2), 0 18px 32px rgba(0,0,0,.35)'}} />
    {Array.from({length: 4}).map((_, i) => (
      <div key={i} style={{position: 'absolute', left: x + 28 + i * 38, top: y - 65, width: 30, height: 88, borderRadius: 20, background: '#ece7d4', transform: `rotate(${i % 2 ? -8 : 8}deg)`}} />
    ))}
  </div>
);

const Bubble: React.FC<{x: number; y: number; text: string; opacity: number}> = ({x, y, text, opacity}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      maxWidth: 330,
      padding: '12px 16px',
      borderRadius: 16,
      background: '#fff0bd',
      color: '#1b1710',
      fontSize: 22,
      fontWeight: 800,
      opacity,
      boxShadow: '0 10px 22px rgba(0,0,0,.28)',
    }}
  >
    {text}
  </div>
);
