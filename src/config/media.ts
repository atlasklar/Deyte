/*
 * Homepage media generated on Higgsfield, served from Higgsfield's CDN.
 * Run scripts/fetch-media.sh to bake the scroll scenes into frame sequences
 * under /public/seq — the homepage picks them up automatically (smoother on phones).
 */

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_32mz0W7AAgZBsJu1VXh0Yle7wRM";

export const MEDIA = {
  rose: {
    video: `${CDN}/hf_20261018_162343_60b674ae-d396-434a-9686-a838a0c99283.mp4`,
    poster: `${CDN}/hf_20261018_162301_8cad680c-ed00-445e-aa9c-2918087b3240_min.webp`,
    seq: "/seq/rose",
  },
  toast: {
    video: `${CDN}/hf_20261018_162356_ad371d32-16ca-4035-9441-c37405d6427a.mp4`,
    poster: `${CDN}/hf_20261018_162301_31d93bdd-1d9e-4f35-a2e6-439d017ae7bc_min.webp`,
    seq: "/seq/toast",
  },
  bar: {
    video: `${CDN}/hf_20261018_162347_ef20fe0b-c175-4f47-bd92-711cbd61cdc9.mp4`,
    poster: `${CDN}/hf_20261018_161928_0cb4bfbd-306c-4660-a47c-7b756450bebc_min.webp`,
  },
  stages: {
    before: `${CDN}/hf_20261018_161928_b7907ab3-1726-46db-abdf-dd44a3a52ceb_min.webp`,
    dating: `${CDN}/hf_20261018_161927_4882540f-9843-46a9-8a39-e8253da081fb_min.webp`,
    together: `${CDN}/hf_20261018_161928_5f808181-ec47-4430-82a9-6cf77f72dac4_min.webp`,
  },
};
