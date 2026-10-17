# Imposter 

**A party game for one phone and a group of friends.**

Everyone gets the same secret word, except the imposters. They get a different word that's close enough to bluff with. Give clues, listen carefully, and find out who doesn't belong.

No app to download. No sign-up. No internet needed once it's open.

---

## What you need

- 1 phone (or any device with a browser)
- 3 to 20 players
- About 5–10 minutes per round

---

## How to start

1. Open `index.html` in any browser (Chrome, Safari, Edge, Firefox).
2. Tap **Start Game**.

**Tip:** On your phone, tap **Share → Add to Home Screen** so Imposter opens like a regular app.

---

## How to play

### 1. Set up
Choose how many people are playing and how many imposters there should be. Then tap **Start**.

### 2. Get your secret word
Pass the phone around. When it's your turn:

1. Type your name.
2. Tap **Reveal My Word** and memorise it. Don't let anyone see!
3. Tap **Hide & Pass** and hand the phone to the next person.

You won't be told whether you're an imposter. You only see your word.

### 3. Give clues
Once everyone has their word, tap **Start Playing**. The game picks someone to go first.

Go around the group. Each person says **one short clue** about their word, without saying the word itself.

> Say the word is **Chai**. Good clues: *"Best in the morning"*, *"Goes with rusk"*, *"Comes in a kulhad"*.
> The imposter might have **Coffee** and still sound like they belong.

### 4. Vote
Talk it over, then pick together who you think the imposters are. Select them on screen and tap **Reveal**.

### 5. The big reveal
See who the imposters really were, what both words were, and whether your group caught them.

Then pick one:
- **Play Again**: same players, new words, new imposters
- **New Game**: change the players or settings
- **Home**: back to the start screen

---

## Tips for a great game

- **Crew:** be specific enough to prove you're not the imposter, but vague enough that the imposter can't guess your word.
- **Imposters:** listen first. If a clue doesn't fit your word, you might be the imposter, so blend in!
- **Everyone:** keep clues short. One line is enough.
- Play a few rounds. It gets better once everyone knows each other's style.

---

## What's inside

Over **650 word pairs** made for Indian Gen Z, across 33 categories, including:

Street Food · Desi Khana · Mithai · Chai & Drinks · Snacks · Apps · Bollywood · OTT & TV · Cricket · Music · Creators · Gen Z Slang · College Life · Desi Ghar · Festivals & Shaadi · Travel · Fashion · and more.

Some examples: *Vada Pav vs Dabeli*, *Blinkit vs Zepto*, *CSK vs MI*, *Rizz vs Aura*, *Shinchan vs Doraemon*.

The game avoids repeating recent word pairs, so every round feels fresh.

---

## Questions

**Do I need the internet?**
No. Once the game is open, it works fully offline.

**Is my data saved anywhere?**
Only on your own device. Names, settings and your current round are kept in your browser. Nothing is uploaded or shared.

**I closed the browser by mistake. Is the round lost?**
No. Open the game again and tap **Resume Round**.

**Can someone see the previous player's word?**
No. Each word is shown only to its player and disappears as soon as they hide it. The back button won't bring it back, and the word hides itself if the phone is locked.

**Can I use dark mode?**
Yes. The game follows your phone's setting. You can also switch with the sun/moon button in the top corner.

**How many imposters should we have?**
1 imposter for 3–6 players, 2 for 7–12, and 3 or more for bigger groups works well.

---

## For developers

Plain HTML, CSS and JavaScript. No build step, no install.

| File | What it does |
|------|--------------|
| `index.html` | The page |
| `css/styles.css` | All styling, light and dark themes |
| `js/words.js` | The word-pair list (add your own here) |
| `js/game.js` | Game rules |
| `js/screens.js` | Each screen of the game |
| `js/app.js` | Saving, navigation, theme |
| `js/fx.js` | Animations |

**Add your own word pairs:** open `js/words.js`, find a category, and add a line like `['Word One', 'Word Two'],`.

**Run the checks:**

```bash
node test/game.test.js
```

---

Made for game nights, hostel rooms, road trips and family gatherings. Have fun! 🎉
