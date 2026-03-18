export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  screenshot?: string;
  screenshotAlt?: string;
  tags: string[];
}

export interface FAQSection {
  id: string;
  title: string;
  icon: string;
  entries: FAQEntry[];
}

export const playerGuideData: FAQSection[] = [
  // ─── 1. Getting Started ───────────────────────────────────────────
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "\u{1F680}",
    entries: [
      {
        id: "what-is-elysium-rising",
        question: "What is Elysium Rising?",
        answer:
          "Elysium Rising is a browser-based incremental MMORPG set in the world of the <strong>Towers of Elysium</strong> book trilogy. You progress through the story by battling enemies in real-time clicker combat, training skills while offline, collecting artifacts, and competing on leaderboards \u2014 all from your browser.",
        tags: ["overview", "new-player", "about"],
      },
      {
        id: "choosing-a-class",
        question: "How do I choose a class?",
        answer:
          "During character creation you pick one of four classes, each with a different stat lean:<br/><strong>Vessel</strong> \u2014 balanced STR/AGI/INT, good all-rounder.<br/><strong>Drifter</strong> \u2014 high AGI, crit-focused.<br/><strong>Conduit</strong> \u2014 high INT, strong auto-DPS scaling.<br/><strong>Architect</strong> \u2014 high STR, raw click damage. Your class shapes early gameplay but all builds are viable long-term.",
        tags: ["class", "character", "creation", "stats"],
      },
      {
        id: "first-steps",
        question: "What should I do first?",
        answer:
          "After creating your character you land on the <strong>Map</strong>. Open Chapter 1, click the first scene node, and hit <em>Enter Story Mode</em>. The game teaches itself from there \u2014 narrative text scrolls on the left while you fight enemies on the right.",
        tags: ["tutorial", "new-player", "map"],
      },
    ],
  },

  // ─── 2. Game Hub ──────────────────────────────────────────────────
  {
    id: "game-hub",
    title: "Game Hub",
    icon: "\u{1F5FA}\uFE0F",
    entries: [
      {
        id: "the-map",
        question: "How does the Map work?",
        answer:
          "The Map is your primary navigation. It displays all 3 books, their chapters, and every scene within each chapter. Completed scenes show a checkmark; boss nodes appear at chapter ends. Click any unlocked scene to view its info panel, then enter it.",
        screenshot: "map-overview.png",
        screenshotAlt: "Map overview showing books, chapters, and scene nodes",
        tags: ["map", "navigation", "scenes", "chapters"],
      },
      {
        id: "map-progression",
        question: "How do I unlock new chapters?",
        answer:
          "Clear every scene in a chapter (including the chapter boss) to unlock the next one. Book transitions require beating the book boss. The map greys out locked content so you always know what's next.",
        screenshot: "map-advanced.png",
        screenshotAlt: "Advanced map view showing locked and unlocked chapters",
        tags: ["map", "progression", "unlock"],
      },
      {
        id: "sidebar-tabs",
        question: "What are the sidebar tabs?",
        answer:
          "Six tabs line the sidebar:<br/><strong>Map</strong> \u2014 scene navigation.<br/><strong>Skills</strong> \u2014 idle training and skill tree.<br/><strong>Home</strong> \u2014 Akashic Log, Relic Gallery, Achievements, Leaderboards.<br/><strong>Shop</strong> \u2014 Emporium, Marketplace, NPC Vendor.<br/><strong>Ascendant</strong> \u2014 profile and character stats.<br/><strong>Chat</strong> \u2014 global chat.",
        tags: ["sidebar", "navigation", "tabs", "ui"],
      },
    ],
  },

  // ─── 3. Story Mode ────────────────────────────────────────────────
  {
    id: "story-mode",
    title: "Story Mode",
    icon: "\u2694\uFE0F",
    entries: [
      {
        id: "entering-a-scene",
        question: "How do I enter a scene?",
        answer:
          "Click a scene node on the Map to open its info panel \u2014 it shows the chapter, scene name, and enemy preview. Hit <strong>Enter Story Mode</strong> to begin. If the scene is locked, you need to clear the preceding one first.",
        screenshot: "scene-info.png",
        screenshotAlt: "Scene info modal with Enter Story Mode button",
        tags: ["scene", "enter", "start", "map"],
      },
      {
        id: "combat-loop",
        question: "How does combat work?",
        answer:
          "The screen splits in two: <strong>left panel</strong> shows WPM-timed narrative text from the book, <strong>right panel</strong> is a PixiJS combat stage with enemy sprites. Click enemies to deal your click damage; your auto-DPS handles continuous damage in the background. Enemies spawn in waves that scale with the zone.",
        screenshot: "combat.png",
        screenshotAlt: "Story Mode combat view with narrative and enemy stage",
        tags: ["combat", "click", "auto-dps", "enemies", "waves"],
      },
      {
        id: "session-upgrades",
        question: "What are session upgrades?",
        answer:
          "Killing enemies drops gold <em>within the session</em>. Spend it on four upgrade categories: <strong>Click Damage</strong>, <strong>Auto-DPS</strong>, <strong>Crit Chance</strong>, and <strong>Gold Rate</strong>. Use the bulk-buy buttons (x1 / x10 / x100 / MAX) to level them quickly. These upgrades reset each session \u2014 they don't carry over.",
        tags: ["upgrades", "gold", "session", "click-damage", "auto-dps", "crit"],
      },
      {
        id: "completing-a-scene",
        question: "When is a scene complete?",
        answer:
          "Two conditions must <strong>both</strong> be met: the narrative must reach 100% <em>and</em> all enemy waves must be cleared. Once both are done, the Scene Complete modal appears showing your gold earned, Elysium Essence gained, and any item drops.",
        screenshot: "scene-complete.png",
        screenshotAlt: "Scene Complete modal showing rewards summary",
        tags: ["complete", "scene", "narrative", "waves", "rewards"],
      },
      {
        id: "wpm-font-controls",
        question: "Can I control the text speed and size?",
        answer:
          "The bottom bar has a <strong>WPM slider</strong> (150\u2013600 words per minute) and a <strong>font size slider</strong> (8\u201328px). There's also an <em>Auto Progress</em> toggle that advances paragraphs automatically once the current one finishes \u2014 useful if you want a hands-off reading experience.",
        tags: ["wpm", "font", "text", "speed", "settings", "auto-progress"],
      },
    ],
  },

  // ─── 4. Boss Fights ───────────────────────────────────────────────
  {
    id: "boss-fights",
    title: "Boss Fights",
    icon: "\u{1F479}",
    entries: [
      {
        id: "chapter-bosses",
        question: "Where do bosses appear?",
        answer:
          "Boss nodes sit at the end of each chapter on the Map. They're a single large enemy with a <strong>countdown timer</strong> \u2014 you must kill the boss before time runs out or the attempt fails. Book bosses gate progression to the next book.",
        screenshot: "boss-info.png",
        screenshotAlt: "Boss info modal showing boss stats and timer",
        tags: ["boss", "chapter", "book", "timer"],
      },
      {
        id: "interrupt-mechanics",
        question: "What are interrupt mechanics?",
        answer:
          "During a boss fight, one of three interrupt events can appear at random:<br/><strong>Click Burst</strong> \u2014 rapidly click to fill a progress bar before it expires.<br/><strong>Target Zone</strong> \u2014 a glowing circle appears at a random screen position; click it fast.<br/><strong>Whack Sequence</strong> \u2014 three pop-up zones appear one after another; click each in order.<br/>Succeeding deals massive burst damage to the boss.",
        screenshot: "interrupt-click-burst.png",
        screenshotAlt: "Click Burst interrupt with progress bar during boss fight",
        tags: ["boss", "interrupt", "click-burst", "target-zone", "whack-sequence"],
      },
      {
        id: "boss-rewards",
        question: "What do I get for beating a boss?",
        answer:
          "First-clear triggers a <strong>Narrative Reveal</strong> \u2014 a cinematic overlay with star particles and transition lore text from the book. You can replay bosses anytime but only the first clear grants the lore reward and any curated artifact drops.",
        screenshot: "boss-narrative.png",
        screenshotAlt: "Narrative Reveal cinematic after defeating a boss",
        tags: ["boss", "rewards", "lore", "narrative-reveal", "first-clear"],
      },
      {
        id: "boss-tips",
        question: "Any tips for tough bosses?",
        answer:
          "Auto-DPS does most of the heavy lifting, so invest in it via session upgrades. Focus your attention on <strong>interrupts</strong> \u2014 they deal disproportionately large damage. Early bosses die fast, but later ones demand real skill investment from idle training. If you're hitting a wall, go farm earlier scenes for essence and level up your skills.",
        screenshot: "boss-fight.png",
        screenshotAlt: "Boss fight in progress with large enemy and timer",
        tags: ["boss", "tips", "strategy", "auto-dps", "interrupts"],
      },
    ],
  },

  // ─── 5. Farm Mode ─────────────────────────────────────────────────
  {
    id: "farm-mode",
    title: "Farm Mode",
    icon: "\u{1F33E}",
    entries: [
      {
        id: "what-is-farm-mode",
        question: "What is Farm Mode?",
        answer:
          "After completing a scene, you can choose <strong>Continue (Farm Mode)</strong> instead of returning to the hub. Waves keep spawning with scaling difficulty, letting you grind gold far beyond the initial clear.",
        screenshot: "farm-mode.png",
        screenshotAlt: "Farm Mode with scaling enemy waves and gold counter",
        tags: ["farm", "grind", "gold", "post-clear"],
      },
      {
        id: "why-farm",
        question: "Why should I farm?",
        answer:
          "Gold earned in Farm Mode converts to <strong>Elysium Essence</strong> when you exit. Longer sessions mean more permanent currency. You'll see a <em>\"Monsters scaling up...\"</em> indicator as waves get harder \u2014 that's your signal that the payoff is increasing too.",
        tags: ["farm", "essence", "gold", "conversion", "grind"],
      },
      {
        id: "when-to-stop",
        question: "When should I stop farming?",
        answer:
          "When enemy HP outpaces your damage and kills slow down significantly, the gold-per-minute drops off. At that point, exit to bank your essence. You can always re-enter the same scene later with better skills.",
        tags: ["farm", "efficiency", "stop", "strategy"],
      },
    ],
  },

  // ─── 6. Idle Training ─────────────────────────────────────────────
  {
    id: "idle-training",
    title: "Idle Training",
    icon: "\u{1F9D8}",
    entries: [
      {
        id: "starting-training",
        question: "How do I start training a skill?",
        answer:
          "Open the <strong>Skills</strong> tab in the sidebar, pick a skill, and hit start. Each tick grants XP on a fixed timer (e.g., every 3 seconds). You can only train one skill at a time, so choose wisely.",
        screenshot: "idle-start.png",
        screenshotAlt: "Skills tab with training start button",
        tags: ["idle", "training", "skills", "xp"],
      },
      {
        id: "offline-progress",
        question: "Does training continue when I'm offline?",
        answer:
          "Yes. Training runs in the background even when you close your browser. When you return, an offline report shows how many levels you gained while away. Start training before logging off to maximize idle gains.",
        screenshot: "idle-active.png",
        screenshotAlt: "Active training session with progress indicator",
        tags: ["idle", "offline", "progress", "background"],
      },
      {
        id: "skill-prerequisites",
        question: "Why can't I train a certain skill?",
        answer:
          "Some skills have prerequisites \u2014 other skills that must reach a certain level first. For example, <em>Powersurge</em> requires Magic Level 10. Check the skill's tooltip to see what's needed.",
        tags: ["skills", "prerequisites", "locked", "requirements"],
      },
      {
        id: "skill-combat-impact",
        question: "How do skill levels affect combat?",
        answer:
          "Skill levels directly boost your <strong>auto-DPS</strong> in Story Mode. The formula sums <code>auto_dps_base \u00d7 level</code> across all your skills, so every level-up makes passive damage tick harder. This is the main way to scale into later chapters.",
        tags: ["skills", "auto-dps", "combat", "scaling", "damage"],
      },
    ],
  },

  // ─── 7. Home Base ─────────────────────────────────────────────────
  {
    id: "home-base",
    title: "Home Base",
    icon: "\u{1F3E0}",
    entries: [
      {
        id: "akashic-log",
        question: "What is the Akashic Log?",
        answer:
          "Your journal. It organizes everything in a <strong>Book &gt; Chapter &gt; Scene &gt; Beat</strong> hierarchy and shows completion percentage at every level. <em>\"New\"</em> badges highlight recently unlocked content so you never miss fresh story beats.",
        tags: ["akashic-log", "journal", "lore", "completion", "story"],
      },
      {
        id: "relic-gallery",
        question: "What's in the Relic Gallery?",
        answer:
          "A visual collection of every artifact in the game. Collected items display their stats and rarity; undiscovered ones appear as silhouettes. Curated artifacts drop from boss first-clears and chapter mastery milestones \u2014 these are the rare ones worth chasing.",
        tags: ["relic-gallery", "artifacts", "collection", "curated", "drops"],
      },
      {
        id: "achievement-matrix",
        question: "How do achievements work?",
        answer:
          "110 achievements span 5 categories: <strong>Combat</strong>, <strong>Discovery</strong>, <strong>Economics</strong>, <strong>Idle</strong>, and <strong>Narrative</strong>. They follow chain progression (Tier I \u2192 II \u2192 III), and high-tier completions award <strong>Titles</strong> that display next to your name in chat and leaderboards.",
        tags: ["achievements", "titles", "combat", "discovery", "chain"],
      },
      {
        id: "hall-of-echoes",
        question: "What are the leaderboards?",
        answer:
          "The Hall of Echoes has four boards:<br/><strong>Vanguard</strong> \u2014 furthest story progression.<br/><strong>Alchemist</strong> \u2014 most Elysium Essence earned.<br/><strong>Swift</strong> \u2014 fastest boss kill times.<br/><strong>Scholar</strong> \u2014 most lore entries collected.",
        tags: ["leaderboards", "hall-of-echoes", "rankings", "competitive"],
      },
      {
        id: "inventory",
        question: "How does the inventory work?",
        answer:
          "Equip and unequip gear to modify your <strong>STR / AGI / INT</strong> stats. The inventory panel shows stat impact in real-time as you swap items, so you can compare before committing.",
        tags: ["inventory", "equip", "gear", "stats", "str", "agi", "int"],
      },
    ],
  },

  // ─── 8. Economy ───────────────────────────────────────────────────
  {
    id: "economy",
    title: "Economy",
    icon: "\u{1F4B0}",
    entries: [
      {
        id: "elysium-essence",
        question: "What is Elysium Essence?",
        answer:
          "The permanent, non-premium currency. You earn it from clearing scenes, exiting Farm Mode (gold converts to essence), and salvaging items. It fuels character progression and idle training costs.",
        tags: ["essence", "currency", "permanent", "gold", "conversion"],
      },
      {
        id: "shards",
        question: "What are Shards?",
        answer:
          "The premium currency. Purchase them with real money via Stripe, or earn small amounts through gameplay milestones. Shards are spent in the Emporium (cosmetics), the Marketplace (player trading), and on premium convenience items.",
        tags: ["shards", "premium", "currency", "stripe", "purchase"],
      },
      {
        id: "emporium",
        question: "What's in the Emporium?",
        answer:
          "Cosmetics only: skins, flair, badges, avatars, and bundles. Everything is purchased with Shards. Nothing in the Emporium gives combat power \u2014 it's purely visual.",
        tags: ["emporium", "shop", "cosmetics", "skins", "shards"],
      },
      {
        id: "marketplace",
        question: "How does the Marketplace work?",
        answer:
          "Player-to-player trading. List artifacts or gear for a Shard price you set. Buyers pay the listed price; sellers receive 95% after a <strong>5% tax</strong> that gets burned from the economy. Browse, buy, and sell freely.",
        tags: ["marketplace", "trading", "buy", "sell", "tax", "player-to-player"],
      },
      {
        id: "npc-vendor",
        question: "What does the NPC Vendor do?",
        answer:
          "Salvage unwanted items for Elysium Essence. A preview shows the exact salvage value before you confirm, so there are no surprises. Good for clearing out low-rarity artifact clutter.",
        tags: ["vendor", "salvage", "npc", "essence", "sell"],
      },
      {
        id: "donations",
        question: "Can I support the game financially?",
        answer:
          "Yes. The Donations page offers patron tiers via Stripe. Donors appear on the <strong>Donor Hall</strong> leaderboard and may receive cosmetic perks depending on their tier.",
        tags: ["donations", "patron", "support", "donor-hall"],
      },
    ],
  },

  // ─── 9. Social ────────────────────────────────────────────────────
  {
    id: "social",
    title: "Social",
    icon: "\u{1F4AC}",
    entries: [
      {
        id: "global-chat",
        question: "How does chat work?",
        answer:
          "Open the <strong>Chat</strong> tab in the sidebar. It's a real-time WebSocket channel shared by all players. Messages display as <code>[PlayerName Lv.X]</code> so you can see who's talking and their level at a glance.",
        screenshot: "chat.png",
        screenshotAlt: "Global chat with player messages and level badges",
        tags: ["chat", "global", "websocket", "messages"],
      },
      {
        id: "rate-limiting",
        question: "Is there a message limit?",
        answer:
          "20 messages per minute. If you exceed that, you'll see a <em>\"sending too fast\"</em> warning and need to wait before sending again. This keeps the channel readable for everyone.",
        tags: ["chat", "rate-limit", "spam", "cooldown"],
      },
      {
        id: "profanity-filter",
        question: "Is chat moderated?",
        answer:
          "A blocklist-based profanity filter auto-replaces flagged words. It's not perfect, but it catches the obvious stuff. Keep it civil \u2014 repeated abuse can result in chat restrictions.",
        tags: ["chat", "profanity", "filter", "moderation"],
      },
      {
        id: "titles-display",
        question: "How do I get a title next to my name?",
        answer:
          "Titles are earned from high-tier achievements (Tier II and III). Once earned, your active title displays next to your name in chat and on leaderboards. Check the Achievement Matrix to see which ones grant titles.",
        tags: ["titles", "achievements", "display", "name", "chat"],
      },
    ],
  },

  // ─── 10. Settings & Tips ──────────────────────────────────────────
  {
    id: "settings-tips",
    title: "Settings & Tips",
    icon: "\u2699\uFE0F",
    entries: [
      {
        id: "audio-controls",
        question: "How do I adjust audio?",
        answer:
          "Click the <strong>\u{1F3B5}</strong> button to open Audio Settings: sliders for Master, Music, and SFX volume plus a global mute toggle. The <strong>\u{1F50A}</strong> button quick-toggles mute. In Story Mode, the <strong>\u23F8</strong> button pauses the music track independently.",
        screenshot: "audio-settings.png",
        screenshotAlt: "Audio settings panel with volume sliders",
        tags: ["audio", "music", "sfx", "volume", "mute", "settings"],
      },
      {
        id: "music-controls",
        question: "What are the music controls in Story Mode?",
        answer:
          "Each scene has a synthesized 8-bit soundtrack matched to its atmosphere archetype. The music cross-fades over 2 seconds when you change scenes. If you switch browser tabs, music auto-pauses and resumes when you return.",
        screenshot: "music-controls.png",
        screenshotAlt: "Music control buttons in Story Mode",
        tags: ["music", "8-bit", "atmosphere", "cross-fade", "tab-visibility"],
      },
      {
        id: "reduce-motion",
        question: "Can I disable animations?",
        answer:
          "In <strong>\u2699 Game Settings</strong>, enable <em>Reduce Motion</em> to suppress all CSS animations and transitions. Useful for accessibility or lower-end devices.",
        tags: ["reduce-motion", "accessibility", "animations", "performance", "settings"],
      },
      {
        id: "profile-editing",
        question: "How do I change my display name?",
        answer:
          "Visit <strong>/profile</strong> (or click the Ascendant tab). From there you can change your alias, view detailed character stats, and manage your account settings.",
        screenshot: "profile.png",
        screenshotAlt: "Profile page with alias editor and character stats",
        tags: ["profile", "alias", "name", "account", "settings"],
      },
      {
        id: "pro-tips",
        question: "Any pro tips?",
        answer:
          "<strong>Farm Mode gold converts to Elysium Essence</strong> \u2014 longer sessions mean more permanent progress.<br/><strong>Idle training runs offline</strong> \u2014 always start a training session before logging off.<br/><strong>Boss interrupts deal massive damage</strong> \u2014 never ignore them, even if your auto-DPS seems strong enough.<br/><strong>Check the Akashic Log</strong> after each chapter for new story beats and lore entries.<br/><strong>Marketplace tax is 5%</strong> \u2014 factor that in when pricing your listings.",
        tags: ["tips", "strategy", "farm", "idle", "boss", "marketplace"],
      },
    ],
  },
];
