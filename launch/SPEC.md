GOAL:    a developer finishes thinking "my date parser probably gets this wrong too" and opens the results.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps, silent (no music source signed in; see README note)
TIME:    31.5 s x 30 = 945 frames
LOOK:    the site's own material. Paper #f9f9f7, ink #16181d, muted #5f636b, day cells #efefec.
         Blue #0b6fd3 means "the answer key accepts this" and nothing else; red #c8262b means wrong.
         Instrument Serif 400 for titles (112 px, -1.5% tracking) and day numbers (40 px);
         Geist for labels (26-36 px); Geist Mono for the phrase under test (40 px).
         Medium: 4x4 Bayer dither. Every density is dither cells (3 px), never a gradient or glow.
         No shadows, no grain, no vignette.
OBJECTS: the calendar (5 weeks from Mon 19 Oct 2026, "now" on Wed 28 Oct), the eleven libraries as
         their real grey dither avatars from the site, a rack of eleven slots they wait in,
         the leaderboard rows with dithered bars.
MOTION:  enter expo.out (cubic-bezier(.16,1,.3,1)); move power3.inOut; fall power2.in; exit power2.in.
         Title lines rise inside a mask in 16 f, leave in 10 f. Avatars travel in 16 f, 2-3 f stagger.
         Density changes step through dither levels, never fade.
SHOTS:   (one frame that rebuilds: the calendar is home, the avatars are the carrier)
         0-81    "Which Friday is next Friday?" on frame 0; Friday column tints, 30 Oct and 6 Nov outline blue.
         81-249  the 11 avatars drop: 6 on 6 Nov, 3 on 30 Oct, 2 fall through the grid. Lines: six / three / two.
         249-324 avatars return; the phrase line cycles through real phrases, counter to 180, cells flicker.
         324-414 "4 days from tomorrow": four land on Mon 2 Nov (blue), seven elsewhere (red).
         414-504 "Sun Microsystems was bought by Oracle": five drop onto days (red); six stay home and turn blue.
         504-582 "Room 1104": three fly into the header and the year rolls to 1104 in red.
         582-600 avatars fly into leaderboard rows; the calendar dissolves.
         600-810 bars grow, 137 rolls in; an 80% line drops through every bar; wrong segments append in red;
                 "Saying nothing beats guessing".
         810-945 a blue dither floor rises; "Next Friday" resolves through dither; the line and the button hold 2.5 s.
BANNED:  dark void; glow, bloom, particles; gradients other than dither; glass; italic accent words;
         numbered labels; mono caps labels; pill chips; everything fading up; text moving while read;
         corner labels or frames; three cards in a row; docked logo; any number not in results.json.
QA:      f0 reads as a poster; f150 shows 6/3 clusters; f370 Mon 2 Nov outlined; f460 rack rings blue;
         f560 year reads 1104 in red; f700 bars + 137; f930 wordmark, line and button sharp.
