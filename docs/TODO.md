# ERP Project Kickstart TODO

## 7. Phase 1: Onboarding, Authentication, Profiles & Initial Admin Panel
... [rest of file] ...
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

---
*Updated: 2026-03-01*

## Book Processing 📚
- [ ] **Book Processing**
  - [ ] Execute processing and load to DB (Phase 1 - extract and split the text).

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

---

