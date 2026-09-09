#!/bin/zsh
set -euo pipefail
source_dir="/Users/kenkong/.codex/generated_images/01a07614-a4da-70b0-afca-e97c39228b89"
hub_dir="/Users/kenkong/Documents/ChatGPT/網頁遊戲/maths-block-world-hub/public/badges"
number_dir="/Users/kenkong/Documents/ChatGPT/網頁遊戲/public/badges"
algebra_dir="/Users/kenkong/Documents/ChatGPT/網頁遊戲/algebra-block-world/public/badges"
mkdir -p "$hub_dir" "$number_dir" "$algebra_dir"
typeset -A files=(
  stage-directed-number-locate exec-160ac2ba-6ae5-4fc2-b486-08612e6efe59.png
  stage-directed-number-compare exec-7997f69c-ea2e-4979-b9ad-96cfdb4d70bc.png
  stage-directed-number-move exec-9f6f3615-0b5b-46fe-a789-f47b1035385d.png
  stage-directed-number-brackets exec-295f5de4-50fd-4cd6-8d0d-c8cb4a555431.png
  stage-directed-number-multiply exec-38fee69b-3898-447a-b36e-49a8f96adc9f.png
  stage-directed-number-divide exec-03cb17ad-2762-48b6-bc0a-de34141c411e.png
  stage-directed-number-mixed exec-e32b74b2-d9b3-49e6-b575-542cb6522517.png
  stage-algebra-words exec-5f3833e1-f95c-4652-aa00-aa783bfcc70a.png
  stage-algebra-add-subtract exec-edc53473-50ee-4645-aee6-8feaff3175fc.png
  stage-algebra-multiply-divide exec-13ebcdcc-8dfe-428c-a42a-4b41801da017.png
  stage-algebra-expand exec-1b8771fb-d749-4844-af07-182984b2b376.png
  stage-algebra-mixed-expand exec-51798c57-7d72-4c79-ac2b-0096af6637df.png
  stage-algebra-substitute exec-88a94e04-0c20-48ca-8265-302d80de41ae.png
  stage-algebra-sequence exec-4da62c31-9295-4141-a5d4-d8a1737a9348.png
  first-expedition exec-a07f6231-ef53-45b6-a2d7-76a70c251db4.png
  ten-streak exec-cfb5b5de-fa78-4af0-993c-c561bb19503c.png
  perfectionist exec-c0e924b8-7199-44f5-a0a0-ba16b407dd61.png
  directed-master exec-a719c321-7821-479a-847b-f8dd2399d452.png
  algebra-master exec-589ee9bc-d366-4de3-bac0-b7a6e71db166.png
  maths-explorer exec-b47cebde-d16e-4e63-9892-45a0f47883d8.png
  all-rounder exec-a3b5cd6d-66fe-443d-9b75-76d2b98b50a8.png
  mystery-100 exec-6a5b5838-e4da-46a7-a610-80340c3ff9e5.png
  mystery-500 exec-93fd871d-c29b-4818-9ffc-c41f272f8ac6.png
)

for asset source in ${(kv)files}; do
  for size in 128 64 48; do
    node "/Users/kenkong/Documents/ChatGPT/網頁遊戲/maths-block-world-hub/scripts/resize-badge.mjs" "$source_dir/$source" "$hub_dir/$asset-$size.png" "$size"
  done
  cp "$hub_dir/$asset-128.png" "$number_dir/$asset-128.png"
  cp "$hub_dir/$asset-128.png" "$algebra_dir/$asset-128.png"
done
