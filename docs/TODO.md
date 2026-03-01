# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Core Gameplay Mechanics
  - [ ] Create the breakdown requirements and detailed information needed to build out the first implementation of the game.
  - [ ] Need to ensure it captures the story mapping portion (clicker part), and then bake into the skills leveling (progression outside of the clicking game - things like progresing in the game will unlock auto-progress skills outside the game - skill design and other bits should be related to concepts and things from within the Elysium Rising books)
  - [ ] Break components up into meaningful requiement sections (game loop, etc...) and continue iterating through the requirements.
  - [ ] Formulate a development/design plan to get these bits done
  - [ ] Migrate the detailed plan into TODO to track and capture.
  - [ ] Begin work on the UI/UX layouts for the game loop screens (no animation or characters yet, just screens and placeholder items)

---
*Updated: 2026-03-01*

## Book Processing Post Processing Stuff
- [ ] **Book Processing Phase 3**
  - [ ] Add in some hidden/secret enemies Variants of ********** (this is the name of the character since that's appearing in my text frequently a series of 10x*) (ranging from class E -> Class SS). Generate these as book relevant characters (get all the big-bosses and come up with a chaotic/cosmic horror mesh as a description). 
  - [ ] Check for some consolidation and cleanup (realize entities from other books might be different.)   
  - [ ] Check for missing data in the locations tables, entitiy tables (e.g. base description, emotional state, sounds, smells, equipment, abiliites). If missing generate.  
- [ ] **MISC**
  - [ ] Clean up text, lots of the ******** from when I left page breaks in there. There's also the introductory bits (copyright pages - chapter 1 for each book). Might want to keep it, maybe just skip it or use as an easter egg (what the hell is this crap - as part of the tutorial or something - also need to see where the TOC went in all of this).


## OTHER MAJOR TASKS  
- [ ] **Security and anti-cheat**
  - [ ] Some level of keyed encryption between server and front end to prevent people on the front from just sending random bonuses to the back end.
  - [ ] Actions and progress must be held server side, all activities have to be passed to the back (clicks, sent tot he back, validated, and then recorded on the back end server).
  - [ ] Purchases, upgrades, etc... are all validated by the back end server (purchase clicked on front end - sent to back). Server detects if the user has enough for the purchase and then debits it, stats updates back to the front end.    
- [ ] **Audio Integration**
  - [ ] Research Eleven Reader API for streaming background audio. (Would like them to advance, need to have access to that part of the book before they can proceed - e.g. on free eleven readers account, so they'd have to buy the book - get stuck in early tutorial lands or something).
  - [ ] Research Eleven SUNO API for streaming background audio.
  - [ ] Generate new sound effect. Generate new background music. Generate Eleven Reader snipping (for the part of the chatper/book).
- [ ] **Class and Skill Design**
  - [ ] Design the classes and systems based off of components from the book. Expand the existing choices to match aesthetic of the book.
- [ ] **Graphics Design**
  - [ ] Generation of actual characters, icons, and other pieces (based on descriptions of the book)
---

