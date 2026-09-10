import type { ImgHTMLAttributes } from 'react';

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> & {
  alt: string;
};

export default function Image(props: ImageProps) {
  const src =
    typeof props.src === 'string' && props.src.startsWith('/')
      ? new URL(`.${props.src}`, document.baseURI).toString()
      : props.src;
  // The GitHub Pages build serves public images directly without optimization.
  // oxlint-disable-next-line next/no-img-element
  return <img {...props} alt={props.alt} src={src} />;
}
