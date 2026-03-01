# ERP Project Kickstart TODO

This document tracks the initial setup and development phases for the Elysium Rising mmorPg (ERP).
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

---
*Updated: 2026-02-28*

## Phase 7: Onboarding, Profiles & Initial Admin 🧭
> **Requirements:** [recs/1_ONBOARDING_INIT_RECS.md](recs/1_ONBOARDING_INIT_RECS.md) | **Schema:** [recs/1_ONBOARDING_INIT_SCHEMA.md](recs/1_ONBOARDING_INIT_SCHEMA.md)

- [ ] **7.12 — Harden Admin Auth** *(RECS §2.2, FR-2.7 through FR-2.10)*
  - [ ] Move IP/email whitelist enforcement from client-side to backend (`get_current_admin()` — should already be done in 7.2).
  - [ ] Retain client-side check in `admin/src/App.tsx` as UX-only fast rejection.
  - [ ] Verify: bypass client-side check with dev tools → backend still returns 403.
  - [ ] Verify: no admin route leaks which check failed (generic "Access denied" only).


- [ ] **7.13 — Onboarding & Admin: Polishing & Refinements**
  - [ ] **Support System:**
    - [ ] Implement robust background task for auto-closing resolved tickets (FR-6.6).
  - [ ] **User Management:**
    - [ ] Implement "Force Logout" action (Session/Token invalidation logic).
  - [ ] **Security & Maintenance:**
    - [ ] Create `backend/utils.py` sanitization helpers (NFR-2).
    - [ ] Apply sanitization to all player inputs (alias, character name, ticket body).
    - [ ] Implement activity log retention policy (NFR-7).
  - [ ] **UI/UX Polish:**
    - [ ] Character Creator: Improve visual feedback for stats.
    - [ ] Admin: Add "Average Resolution Time" and other missing metrics from §9.4.

- [ ] **7.14 — Onboarding & Admin: Polishing & Refinements**
  - [ ] Fetch current marketing materials (Amazon book pages, eleven reader pages, and does-god-exist pages). Use to create summary docs and information for use - SUMMARY_MARKETING.md 
  - [ ] Read and process the books, along with the summary marketing materials to create a theming and BOOKS summary.md files to ensure that development (themes, content, descriptions) are consistent with everything in the books.
  - [ ] Create a styling and theming guide (fonts, colors, imagry) consistent with the look and feel of the books (refer to the book covers here)  
  - [ ] Create an announcement page for does-god-exist.
  - [ ] Update the splash pages and initial classes (to be more in tune with book characters).
  - [ ] Update documentation and instructions to refer to the BOOK synopsis

## Book Processing 📚
- [ ] **Book Processing**
  - [ ] Execute processing and load to DB (Phase 1 - extract and split the text).

 ## OTHER MAJOR TASKS
 - [ ] **Book Processing Phase 3**
    - [ ] Add in some hidden/secret enemies Variants of ********** (this is the name of the character since that's appearing in my text frequently a series of 10x*) (ranging from class E -> Class SS). Generate these as book relevant characters (get all the big-bosses and come up with a chaotic/cosmic horror mesh as a description). 
    - [ ] Check for missing data in the locations tables, entitiy tables (e.g. base description, emotional state, sounds, smells, equipment, abiliites). If missing generate.
    - [ ] Check for some consolidation and cleanup (realize entities from other books might be different.)   
  - [ ] **MISC**
    - [ ] Clean up text, lots of the ******** from when I left page breaks in there. There's also the introductory bits (copyright pages - chapter 1 for each book). Might want to keep it, maybe just skip it or use as an easter egg (what the hell is this crap - as part of the tutorial or something - also need to see where the TOC went in all of this).
  - [ ] **Security and anti-cheat**
    - [ ] Some level of keyed encryption between server and front end to prevent people on the front from just sending random bonuses to the back end.
    - [ ] Actions and progress must be held server side, all activities have to be passed to the back (clicks, sent tot he back, validated, and then recorded on the back end server).
    - [ ] Purchases, upgrades, etc... are all validated by the back end server (purchase clicked on front end - sent to back). Server detects if the user has enough for the purchase and then debits it, stats updates back to the front end.    
  - [ ] **Audio Integration**
    - [ ] Research Eleven Reader API for streaming background audio. (Would like them to advance, need to have access to that part of the book before they can proceed - e.g. on free eleven readers account, so they'd have to buy the book - get stuck in early tutorial lands or something).
    - [ ] Research Eleven SUNO API for streaming background audio.
    - [ ] Generate new sound effect. Generate new background music. Generate Eleven Reader snipping (for the part of the chatper/book).

---

