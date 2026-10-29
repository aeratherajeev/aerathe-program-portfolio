# Films

Each clip plays silently on loop in the homepage grid and links to Instagram.

1. Export a 5–10 second clip per film. Vertical (9:16) works best.
2. Compress it so the page stays fast (aim for under 2 MB per clip):

   ffmpeg -i input.mov -t 8 -an -vf "scale=540:-2" -c:v libx264 -preset veryfast -crf 28 -movflags +faststart clip-1.mp4
   ffmpeg -i clip-1.mp4 -ss 1 -frames:v 1 clip-1.jpg

3. Put clip-1.mp4 and clip-1.jpg in this folder.
4. Add an entry to films.json:

   [
     { "src": "films/clip-1.mp4", "poster": "films/clip-1.jpg", "title": "Film title", "url": "https://www.instagram.com/reel/POST_ID/" }
   ]

Leave "url" out to link to the profile instead. With an empty films.json the grid shows placeholder tiles.

Stills: an entry with only "poster" (no "src") shows as a still image. Add "position": "left center"
(or "right center", "center top") if the tile crops off something important.
