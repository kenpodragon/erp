export interface HelpEntry {
  id: string;
  question: string;
  answer: string;
  screenshot?: string;
  screenshotAlt?: string;
  tags: string[];
}

export interface HelpSection {
  id: string;
  title: string;
  icon: string;
  entries: HelpEntry[];
}

export const adminHelpData: HelpSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: "📊",
    entries: [
      {
        id: "dashboard-overview",
        question: "What do the dashboard stats show?",
        answer:
          "The top cards display <strong>total players</strong>, <strong>active users</strong> (24h / 7d / 30d windows), <strong>new registrations</strong>, and <strong>open support tickets</strong>. These refresh on page load.",
        screenshot: "dashboard.png",
        screenshotAlt: "Admin dashboard overview with stat cards and charts",
        tags: ["dashboard", "stats", "players", "overview"],
      },
      {
        id: "dashboard-charts",
        question: "How do the activity charts work?",
        answer:
          "The <strong>Daily Active Users</strong> chart supports 7d / 30d / 90d toggles. The <strong>New Registrations</strong> chart shows the last 30 days. Both update on page load&mdash;there is no live polling.",
        tags: ["dashboard", "charts", "dau", "registrations"],
      },
      {
        id: "dashboard-chapter-distribution",
        question: "What is the Chapter Distribution table?",
        answer:
          "A breakdown of how many players are currently at each book and chapter. Useful for spotting progression bottlenecks or confirming content rollout reach.",
        tags: ["dashboard", "chapters", "progression", "distribution"],
      },
      {
        id: "dashboard-activity-feed",
        question: "How does the Activity Feed work?",
        answer:
          "A real-time feed of player events: logins, logouts, character creation, purchases, etc. Use the <strong>event type filter</strong> to narrow it down. Events stream in reverse chronological order.",
        tags: ["dashboard", "activity", "feed", "events", "filter"],
      },
      {
        id: "dashboard-quick-actions",
        question: "What are the Quick Actions?",
        answer:
          "Shortcut links to <strong>System Settings</strong>, <strong>Search Player</strong>, <strong>Critical Tickets</strong>, and <strong>Audit Log</strong>. They save you from navigating through the sidebar for common admin workflows.",
        tags: ["dashboard", "quick actions", "shortcuts"],
      },
    ],
  },
  {
    id: "player-management",
    title: "Player Management",
    icon: "👥",
    entries: [
      {
        id: "player-search",
        question: "How do I find a player?",
        answer:
          "Navigate to the <strong>Players</strong> page and use the search bar. You can search by alias, email address, or player ID. Results update as you type.",
        screenshot: "player-grants.png",
        screenshotAlt: "Player management page with search and grant controls",
        tags: ["players", "search", "lookup"],
      },
      {
        id: "player-detail",
        question: "What can I see on a player's detail page?",
        answer:
          "Click any player row to open their full profile. Tabs include <strong>Stats</strong> (level, essence, class), <strong>Inventory</strong> (artifacts, items), <strong>Activity</strong> (recent events), and <strong>Finance</strong> (shard balance, purchase history).",
        tags: ["players", "detail", "profile", "stats", "inventory"],
      },
      {
        id: "player-grants",
        question: "How do I grant essence or shards to a player?",
        answer:
          "From the player detail page, use the <strong>Grant Essence</strong> or <strong>Grant Shards</strong> buttons. Enter an amount and a <strong>reason note</strong>&mdash;the reason is required and logged in the audit trail.",
        tags: ["players", "grants", "essence", "shards", "admin"],
      },
      {
        id: "player-item-crafting",
        question: "How does the Item Crafting Tool work?",
        answer:
          "The Item Crafting Tool generates procedural item names using the formula <code>prefix + adjective + base + suffix</code>. Select the components, set stats, and assign it directly to a player's inventory.",
        tags: ["players", "items", "crafting", "inventory"],
      },
      {
        id: "player-progression-editing",
        question: "How do I advance a player's progression?",
        answer:
          "Click <strong>Edit Progression</strong> on their profile. Use the cascading dropdowns: Book &rarr; Chapter &rarr; Scene. A backfill preview shows how many scenes and boss clears will be auto-completed (e.g., <em>\"Will backfill 12 scenes and 2 boss clears\"</em>). Primarily used for testing or support escalations.",
        tags: ["players", "progression", "edit", "backfill", "testing"],
      },
      {
        id: "player-ban",
        question: "How do I ban or unban a player?",
        answer:
          "Toggle the <strong>Ban</strong> button on the player detail page. Banned players see a ban state on their next login attempt. Unbanning restores access immediately.",
        tags: ["players", "ban", "unban", "moderation"],
      },
    ],
  },
  {
    id: "support",
    title: "Support Tickets",
    icon: "🎫",
    entries: [
      {
        id: "support-queue",
        question: "How do I manage the ticket queue?",
        answer:
          "The Support page shows all open and in-progress tickets. Use the <strong>status</strong> and <strong>category</strong> filters to narrow the list. Tickets are sorted by creation date (oldest first).",
        screenshot: "support-ticket.png",
        screenshotAlt: "Support ticket queue with filters and ticket detail view",
        tags: ["support", "tickets", "queue", "filter"],
      },
      {
        id: "support-replying",
        question: "How do I reply to a ticket?",
        answer:
          "Click a ticket to open its detail view with full conversation history. Type your reply at the bottom. Check <strong>\"Internal Note\"</strong> to add a note visible only to admins&mdash;the player will never see it.",
        tags: ["support", "tickets", "reply", "internal note"],
      },
      {
        id: "support-resolving",
        question: "How do I resolve a ticket?",
        answer:
          "Change the ticket status to <strong>Resolved</strong> using the status dropdown. You can add a final reply with your resolution summary before closing.",
        tags: ["support", "tickets", "resolve", "close"],
      },
      {
        id: "support-categories",
        question: "What ticket categories exist?",
        answer:
          "Five categories: <strong>Bug Report</strong>, <strong>Account Issue</strong>, <strong>Billing</strong>, <strong>Feedback</strong>, and <strong>Other</strong>. Players select one when submitting; you can re-categorize if needed.",
        tags: ["support", "tickets", "categories"],
      },
    ],
  },
  {
    id: "world-builder",
    title: "World Builder",
    icon: "🌍",
    entries: [
      {
        id: "world-builder-tabs",
        question: "What are the four main tabs?",
        answer:
          "The World Builder is split into <strong>Narrative Editor</strong> (book/chapter/scene structure), <strong>Content Editor</strong> (game definitions), <strong>Classification</strong> (entity tagging), and <strong>Scaling &amp; Difficulty</strong> (zone tuning).",
        screenshot: "world-builder.png",
        screenshotAlt: "World Builder interface showing narrative editor tabs",
        tags: ["world builder", "tabs", "overview"],
      },
      {
        id: "world-builder-narrative-subtabs",
        question: "What are the Narrative Editor sub-tabs?",
        answer:
          "Ten sub-tabs: <strong>Books</strong>, <strong>Chapters</strong>, <strong>Scenes</strong>, <strong>Beats</strong>, <strong>Entities</strong>, <strong>Mapper</strong>, <strong>Backgrounds</strong>, <strong>Locations</strong>, <strong>Tags</strong>, and <strong>Waves</strong>. Together they define the full game world structure.",
        tags: ["world builder", "narrative", "sub-tabs"],
      },
      {
        id: "world-builder-books",
        question: "How do I edit books?",
        answer:
          "The trilogy has 3 books. You can edit each book's title and assign an <strong>atmosphere</strong> (used by the music system to select the right ambient track).",
        tags: ["world builder", "books", "atmosphere"],
      },
      {
        id: "world-builder-entities",
        question: "How do I manage entities?",
        answer:
          "The <strong>Entities</strong> tab lists all enemies and NPCs. Edit stats (HP, damage, defense), type, family, and gameplay properties. Changes affect all scenes that reference the entity.",
        tags: ["world builder", "entities", "enemies", "npcs", "stats"],
      },
      {
        id: "world-builder-scenes",
        question: "How do I configure scenes?",
        answer:
          "Each scene has wave configurations (enemy spawns per wave), entity assignments, and narrative beat linkages. Waves define the combat flow; beats define the story pacing.",
        tags: ["world builder", "scenes", "waves", "beats"],
      },
      {
        id: "world-builder-content-editor",
        question: "What does the Content Editor cover?",
        answer:
          "CRUD management for core game definitions: <strong>Stat Definitions</strong>, <strong>Character Classes</strong>, <strong>Skills</strong>, <strong>Benefit Effects</strong>, <strong>Item Components</strong>, and <strong>Gear Slots</strong>. These are the building blocks referenced by all other systems.",
        tags: ["world builder", "content editor", "stats", "classes", "skills"],
      },
    ],
  },
  {
    id: "game-tuning",
    title: "Game Tuning",
    icon: "🎮",
    entries: [
      {
        id: "game-configs",
        question: "How do Game Configs work?",
        answer:
          "Over 141 configuration values grouped by category. Each controls a gameplay parameter&mdash;scaling factors, drop rates, caps, multipliers. Edit the value and save; changes take effect on the next player action that reads that config.",
        tags: ["game tuning", "configs", "settings", "balance"],
      },
      {
        id: "game-configs-important",
        question: "Which configs matter most for balance?",
        answer:
          "The critical ones: <code>essence_per_click</code>, <code>crit_chance</code>, <code>crit_multiplier</code>, <code>zone_hp_scaling</code>, <code>zone_gold_scaling</code>, and <code>idle_training_tick_interval</code>. Changing these has an outsized impact on progression speed.",
        tags: ["game tuning", "configs", "balance", "critical"],
      },
      {
        id: "game-tuning-artifacts",
        question: "How do I manage artifacts?",
        answer:
          "50 curated artifacts with multiple tiers each. Edit drop sources, stat bonuses, and rarity weights. Artifact drops integrate into the Story Mode completion flow.",
        tags: ["game tuning", "artifacts", "drops", "rarity"],
      },
      {
        id: "game-tuning-achievements",
        question: "How do achievements work?",
        answer:
          "110 achievements across 5 categories with chain progression (parent &rarr; child). Edit thresholds, rewards, and parent chains. Achievements with a parent require the parent to be completed first.",
        tags: ["game tuning", "achievements", "chains", "rewards"],
      },
    ],
  },
  {
    id: "audio",
    title: "Audio & Music",
    icon: "🎵",
    entries: [
      {
        id: "audio-atmosphere",
        question: "How do I edit atmospheres?",
        answer:
          "The <strong>Atmosphere Editor</strong> manages 21 atmospheres (13 archetypes, 3 training, 5 boss). Each has JSON music definitions for 4 states: <code>explore</code>, <code>combat</code>, <code>boss</code>, and <code>mystery</code>. Use the <strong>Web Audio preview</strong> button to hear changes before saving.",
        tags: ["audio", "atmosphere", "music", "editor"],
      },
      {
        id: "audio-sfx",
        question: "How do I configure sound effects?",
        answer:
          "The <strong>SFX Config Editor</strong> has 17 presets. For each, configure <code>waveform</code>, <code>frequency</code>, <code>duration</code>, and <code>volume</code>. All SFX are synthesized via Web Audio&mdash;no audio files needed.",
        tags: ["audio", "sfx", "sound effects", "config"],
      },
    ],
  },
  {
    id: "finance",
    title: "Finance & Economy",
    icon: "💳",
    entries: [
      {
        id: "finance-overview",
        question: "What does the Finance Overview show?",
        answer:
          "Top-level revenue summary, active subscription counts, and shard circulation stats. This is your at-a-glance view of the game's monetary health.",
        tags: ["finance", "overview", "revenue", "subscriptions"],
      },
      {
        id: "finance-transactions",
        question: "How do I search transactions?",
        answer:
          "The <strong>Transactions</strong> tab shows the full history of all financial events. Filter by date range, transaction type, player, or amount. Each row links to the associated player profile.",
        tags: ["finance", "transactions", "history", "filter"],
      },
      {
        id: "finance-shard-economy",
        question: "How does shard economy tracking work?",
        answer:
          "Tracks total shards <strong>minted</strong> vs <strong>burned</strong> and the net circulation. The anomaly detection system flags unusual spikes&mdash;investigate any alerts before they compound.",
        tags: ["finance", "shards", "economy", "anomaly"],
      },
      {
        id: "finance-marketplace",
        question: "What marketplace metrics are available?",
        answer:
          "Active listings, trade volume, and tax revenue. Watch for <strong>price manipulation</strong> patterns&mdash;repeated buy/sell cycles between the same accounts or sudden price spikes on low-volume items.",
        tags: ["finance", "marketplace", "trading", "manipulation"],
      },
      {
        id: "finance-subscriptions",
        question: "How do I monitor subscriptions?",
        answer:
          "Active subscriber count, estimated MRR, and plan distribution breakdown. Stripe handles billing; this view is read-only analytics.",
        tags: ["finance", "subscriptions", "mrr", "stripe"],
      },
      {
        id: "finance-shop",
        question: "What does Shop Analytics show?",
        answer:
          "Emporium purchase trends, most popular items, and booster usage rates. Use this to decide which items to feature or retire.",
        tags: ["finance", "shop", "emporium", "analytics"],
      },
      {
        id: "finance-donations",
        question: "How are donations tracked?",
        answer:
          "Patron tiers, a donor leaderboard, and total donated amount. Donation data comes from Stripe and updates on webhook events.",
        tags: ["finance", "donations", "patrons"],
      },
    ],
  },
  {
    id: "system",
    title: "System & Admin",
    icon: "🔧",
    entries: [
      {
        id: "system-server-config",
        question: "What can I change in Server Config?",
        answer:
          "Operational settings: <strong>maintenance mode</strong>, <strong>auth bypass</strong>, and <strong>announcement banners</strong>. Changes take effect <em>immediately</em>&mdash;no deploy required.",
        tags: ["system", "server config", "maintenance", "announcements"],
      },
      {
        id: "system-audit-log",
        question: "What does the Audit Log capture?",
        answer:
          "Every admin action with timestamp, admin email, target entity, and action details. Use it for accountability and debugging when something looks off.",
        tags: ["system", "audit log", "actions", "accountability"],
      },
      {
        id: "system-dev-content-audit",
        question: "What is the Dev Content Audit?",
        answer:
          "Tracks missing content: entity sprites, lore text, wave configs, etc. Each entry is a gap that should be resolved before launch. The system auto-detects gaps when fallback entities are generated.",
        tags: ["system", "content audit", "missing content", "dev"],
      },
      {
        id: "system-access-control",
        question: "How do I manage admin access?",
        answer:
          "Owner-only page. Manage the admin email whitelist and toggle the <strong>system admin</strong> flag per user. Only whitelisted emails can access the admin panel.",
        tags: ["system", "access control", "admin", "whitelist"],
      },
      {
        id: "system-caution",
        question: "What should I be careful about?",
        answer:
          "<strong>Maintenance mode</strong> blocks ALL player access instantly. <strong>Auth bypass</strong> should only be enabled in development&mdash;never in production. Both are in Server Config; double-check before toggling.",
        tags: ["system", "caution", "maintenance", "auth bypass"],
      },
    ],
  },
];
