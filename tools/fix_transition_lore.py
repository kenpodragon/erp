"""
Fix 136 chapter boss transition lore texts in the database.
Replaces template placeholders with unique, lore-accurate cinematic texts.
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('C:/Users/ssala/OneDrive/Desktop/MMORPG/erp/backend/.env')
db_url = os.getenv('DATABASE_URL').replace('host.docker.internal', 'localhost')

# Map chapter DB IDs to unique, lore-accurate transition texts.
# Each text references specific narrative events from BOOKS_SUMMARY.md.
TRANSITION_TEXTS = {
    # ===== BOOK 1: Elysium Rising =====
    # Prologue 1: Echoes in the Azure
    3: "The Pointers stand silent across the horizon, their outstretched fingers piercing the azure sky. You witnessed their arrival -- enigmatic harbingers pointing toward something beyond comprehension. The world will never look the same. Whatever they herald, you are now part of it.",
    # Prologue 2: Eyes Open, World Muted
    4: "The veil of mundane existence has thinned. Dreams bleed into your waking hours, whispering of fractures in reality itself. Stephen's ordinary life crumbles as awareness takes root -- the world is muted, but your eyes are finally open to the truth lurking beneath the surface.",
    # Prologue 3: A Zero-Sum Digital Dystopia
    5: "Corporate decay and technological stagnation have hollowed out civilization. In this zero-sum dystopia, humanity drowns in existential malaise while the architects of the prison tighten their grip. But from the ashes of a broken system, the spark of revolution is born.",
    # Prologue 4: Death Walking
    6: "Mortality's cold breath has been confronted and defied. The void stared back, and within its depths, the first stirrings of dreamwalking power ignited. Death is not an ending here -- it is the doorway through which the awakening begins.",
    # iv (interlude)
    7: "The threshold between worlds trembles. What was once a boundary between sleep and waking has become a passage -- a conduit to realms where the architecture of reality itself can be glimpsed, touched, and ultimately reshaped by those bold enough to cross.",
    # 5: From Crash Until Dawn
    8: "From the wreckage of a life in crisis, something extraordinary emerges. The dreams are no longer passive -- they produce tangible effects that ripple into waking reality. Dawn breaks not just on a new day, but on an entirely new understanding of what is possible.",
    # 6: Beyond the Conduits
    9: "You have journeyed beyond the conduits of ordinary perception. In the deep dreamscape, otherworldly architecture stretches into infinity -- crystalline corridors and energy pathways that pulse with the heartbeat of a reality hidden beneath our own.",
    # 7: Grease Stains and Eternal Engines
    10: "Amidst grease and grime, the impossible revealed itself. The Eternal Engine -- a crystalline power source of breathtaking design -- materialized in the dreamscape. Its facets hold the blueprint for technologies that could reshape civilization. The Engine has chosen its keeper.",
    # 8: A World on Hold as Shadows Build
    11: "The waking world teeters on a knife's edge. Reality warps at the seams as Stephen's dream discoveries escalate beyond control. Shadows gather at the periphery of perception, and the foundations of everything believed to be real begin to quake.",
    # 9: Under the Stars
    12: "Beneath the canopy of infinite stars, the weight of cosmic revelation settles upon weary shoulders. The Eternal Engine's implications stretch beyond technology into the very nature of existence. A moment of quiet contemplation before the storm that will change everything.",
    # 10: The Engine Awakens
    13: "The boundary between dream and reality shatters. Elements of the Eternal Engine have been manifested in the waking world -- crystalline impossibilities humming with power that defies every known law of physics. The Engine awakens, and with it, a new era for humanity.",
    # 11: The Price of Loyalty in a Crumbling Empire
    14: "Loyalty is tested as corporate empires crumble. Stephen navigates treacherous politics where ambition and paranoia collide. The Eternal Engine's power has drawn predators and sycophants alike. In a world of shifting allegiances, trust becomes the most dangerous commodity.",
    # 12: A Shower of Visions and Dissonance
    15: "Visions cascade like rain -- each one a fragment of cosmic truth that burns as it lands. The boundary between dreaming and waking has dissolved into static and dissonance. Reality fractures, and through the cracks, something ancient and terrible peers back.",
    # 13: From Boardroom to Rabbit Hole
    16: "The corporate drone has become an entrepreneur, and the boardroom has given way to a rabbit hole of infinite depth. The Eternal Engine's potential is clear now -- not just a power source, but a key to unlocking the fundamental architecture of reality itself.",
    # 14: Unveiling the Secrets of the Eternal Engine
    17: "The Engine's deepest secrets stand revealed. Its crystalline structure maps the topology of the dream realm -- each facet a gateway, each resonance a frequency of creation. The technical mastery achieved here will birth technologies that remake the world.",
    # 15: The Sisyphean Job Hunt
    18: "The absurdity of mundane employment grinds against world-changing knowledge. Like Sisyphus pushing his boulder, Stephen endures the crushing weight of ordinary life while harboring secrets that could liberate -- or destroy -- all of civilization.",
    # 16: The Love-Pat Towards Discovery
    19: "Guided by dream entities whose wisdom spans eons, the next step toward the Infinitron crystallizes. Lady A, Lady Illkeserod, and Madam Osilari nudge their student forward -- a love-pat from the cosmos itself, pushing toward a discovery that will shatter every limit.",
    # 17: Liminal Discoveries
    20: "You stand at the threshold -- neither fully awake nor truly dreaming. In this liminal space, the discoveries multiply: fragments of truth that belong to neither world yet transform both. The liminal is where real power lives, between certainty and mystery.",
    # 18: Getting Swifty at the Quantum Level
    21: "Quantum barriers crumble before unprecedented breakthroughs. At the subatomic level, the science behind the Eternal Engine crystallizes into equations that should be impossible. The quantum realm dances to a new tune, and its melody rewrites the laws of physics.",
    # 519/19: The Infinitron Breakthrough
    22: "The Infinitron lives. A crystalline CPU operating on principles harvested from the dream realm itself -- faster, more powerful, and more fundamentally alien than any technology humanity has ever conceived. S Corp is born in this moment, and the world will never recover.",
    # 20: Beyond the Silicon Dream Valley
    23: "Silicon Valley's dreams are obsolete. The Infinitron has surpassed every existing computing paradigm, and S Corp rises from a garage startup to a force that will reshape global infrastructure. The old world of chips and circuits fades like a half-remembered dream.",
    # 21: The Infinite Unbounded
    24: "S Corp's technology cascades across the globe -- power grids, communications, transportation -- all transformed by the Infinitron's boundless potential. The infinite has been unbounded, and humanity takes its first stumbling steps toward a post-scarcity civilization.",
    # 22: The Crisis on Infinite Circuits
    25: "Every revolution breeds its crisis. The world recoils from S Corp's disruptions -- governments scramble, markets collapse, and the old guard fights to preserve a dying order. Infinite circuits carry infinite consequences, and the political firestorm has only just begun.",
    # 23: Generalized Alchemy Disorder
    26: "Lead into gold. Matter replication technology turns the ancient dream of alchemy into mundane reality. Atoms rearrange at S Corp's command, and scarcity -- that fundamental engine of human suffering -- begins its slow, magnificent death. The alchemists were right all along.",
    # 24: The Maw of the Infernal Abyss
    27: "Dark forces stir in the depths, awakened by S Corp's audacious breakthroughs. The first tendrils of Yaldabaoth's influence reach through the fabric of reality. The abyss has noticed humanity's ambition, and its maw opens wide with ancient, insatiable hunger.",
    # 25: Shattered Dreams, Broken Metal, and a Glimpse of the Impossible
    28: "Dreams shatter. Metal breaks. And through the wreckage, the impossible reveals itself -- beautiful, terrifying, and absolute. A major setback has laid bare the true cost of progress: every step toward liberation awakens something that would prefer humanity remain in chains.",
    # Book the Second intro
    29: "The first act closes, but the curtain rises on darker revelations. Beneath the crown of S Corp's achievements, bones are buried -- secrets of cosmic scale that will test every alliance forged and every truth discovered. The shadows deepen as the real game begins.",
    # 26: Triumvirate Apotheosis Unbounded
    30: "The Triumvirate ascends. Stephen's bond with Lady A, Lady Illkeserod, and Madam Osilari reaches apotheosis -- three cosmic entities and one mortal dreamer united in purpose. Their combined wisdom unlocks doors that were never meant to be opened by human hands.",
    # 27: The Shadow Stirs
    31: "Something vast and malevolent shifts in the cosmic deep. The antagonistic presence that has lurked at the edges of perception makes its first overt move. The shadow stirs, and its waking sends tremors through every layer of reality. The hunt has begun.",
    # 28: Code, Creation, and Consequences
    32: "S Corp's creations have outpaced wisdom. Code begets creation, creation begets consequence, and consequence begets catastrophe. The technologies meant to liberate humanity have developed minds of their own -- and not all of them are benevolent.",
    # 29: Finance, the Final Frontier
    33: "Global finance -- the last bastion of the old world order -- falls before S Corp's advance. Economic warfare erupts across continents as currencies collapse and markets are reborn. Money itself is being redefined, and those who controlled it are desperate and dangerous.",
    # 30: Awakening of the Alpha Ancient
    34: "An entity older than human civilization stirs from aeons of slumber. The Alpha Ancient awakens in response to S Corp's reckless expansion into forbidden territories. Its consciousness unfolds like a galaxy, and its attention falls upon the small, fragile dreamwalker.",
    # 31: Tinkering an Algorithmic Heist
    35: "In the digital shadows, an algorithmic heist unfolds with surgical precision. Covert operations to secure S Corp's position require tinkering at the very edge of legality and sanity. The code is the weapon, the network is the battlefield, and the stakes are absolute.",
    # 32: The Distorted Monarch
    36: "A corrupted authority figure emerges from the wreckage of the old order -- a distorted monarch whose power is built on fear and manipulation. This twisted ruler stands between S Corp and its destiny, wielding influence that even the Infinitron cannot simply overpower.",
    # 33: Pandora's Golden Fools
    37: "The box is open, and golden fools dance in the fallout. Transformative technology unleashed upon an unprepared world creates chaos disguised as paradise. Pandora's gift was never the evil inside -- it was the hope at the bottom, and hope is the cruelest weapon of all.",
    # 34: Chronicles of a Forgotten Ruler in a Modern Den
    38: "Ancient patterns repeat in modern settings. The chronicles of forgotten rulers echo through S Corp's boardrooms and server farms. History is not a straight line but a spiral, and the same cosmic dramas play out with new actors wearing old masks.",
    # 35: Replicating Robots and Reimagining Work
    39: "Matter replicators and automated systems remake the concept of labor itself. Robots replicate, jobs evaporate, and humanity faces the terrifying freedom of a world where work is no longer necessary. The reimagining of purpose has only just begun.",
    # 36: Risen from Ruins
    40: "From the rubble of catastrophe, S Corp rises again. Recovery demands more than technology -- it requires the forging of new alliances and the painful acceptance that some losses are permanent. The ruins are not just physical; they are the shattered remains of innocence.",
    # 37: Nano Genesis Evangelion
    41: "Nanotechnology breaches the final frontier of the infinitely small. Atom by atom, the future is assembled by machines too small to see and too powerful to control. Nano Genesis has begun -- an evangelion of microscopic creation that will reshape matter itself.",
    # 38: Summoning the Infernal Executive
    42: "Through hubris or necessity, a dangerous entity has been contacted through S Corp's work. The Infernal Executive answers the summons with a smile that contains too many teeth. Some deals are sealed not in boardrooms but in the spaces between reality and void.",
    # 39: The Self-Made 6 Million Dollar Man
    43: "Flesh merges with S Corp technology. Stephen undergoes physical augmentation that pushes past every boundary of human capability. The six-million-dollar man was fiction; this is evolution -- self-directed, irreversible, and magnificent in its terrible implications.",
    # 40: Breached: The Deathless Mortal Pawn
    44: "Mortality has been breached. Stephen stands at the threshold between human and something beyond -- a deathless mortal whose very existence challenges the architecture of the prison. The pawn has become a piece that no longer fits on the board.",
    # 41: From Shrine to Wormhole and Back Again
    45: "ERB portal technology tears holes in spacetime itself. From ancient shrines to Einstein-Rosen bridges, the journey spans the gulf between mysticism and science. Teleportation is real, interstellar travel is possible, and the universe just became terrifyingly small.",
    # 42: The Other Line
    46: "A communication channel opens to entities beyond the walls of Etheris. The Other Line crackles with voices that should not exist -- transmissions from outside the prison that reveal its true nature. Someone, or something, has been trying to reach through all along.",
    # 43: Einstein's Echo and the Ethics of Teleportation
    47: "Einstein's theories echo through ERB portals that bend reality to S Corp's will. But teleportation raises questions no physics equation can answer: if you are disassembled and rebuilt, are you still you? The ethics of instantaneous travel haunt every crossing.",
    # 44: Library Dust and Grimy Crowns
    48: "The Akashic Realm opens its infinite halls -- a cosmic library where all knowledge ever conceived gathers dust on shelves that stretch beyond comprehension. Grimy crowns of forgotten wisdom sit waiting for those brave enough to claim them and bear their weight.",
    # 45: Gold, Gateways, and Global Domination
    49: "S Corp's golden age blazes across the globe. ERB portals become gateways to unlimited expansion, and economic supremacy translates into something approaching omnipotence. But global domination carries a price measured not in gold but in the souls it consumes.",
    # 46: The Earthbound Icy Tomb
    50: "Earth's limitations crystallize like ice around ambition. The planet that birthed humanity has become its tomb -- too small, too fragile, too bound by the prison's architecture. The stars call, and those who remain earthbound will be entombed in their own complacency.",
    # 47: Setting the Tower's Foundations
    51: "The foundations of Elysium are laid -- not with steel and concrete, but with dreams and defiance. This tower will pierce the boundary between the prison and whatever lies beyond. Its construction is an act of rebellion against the very architecture of captive reality.",
    # 48: Beyond the Veil of an Unearthed Temple
    52: "Ancient structures older than human civilization emerge from the earth. These unearthed temples predate everything -- every religion, every empire, every dream. Beyond their veils lie truths that were old when the stars were young, and their secrets reshape all understanding.",
    # 49: Halfway to Elsewhere
    53: "The midpoint of the journey crystallizes the stakes. Halfway between ignorance and enlightenment, between Earth and the stars, between mortal and divine. There is no turning back from elsewhere -- the only path is forward through the eye of the cosmic storm.",
    # 50: Bringing the Darkness to Light
    54: "Hidden truths about Etheris and its controllers blaze into terrible clarity. The darkness has been dragged into the light, and what it reveals is worse than any nightmare: the prison is not broken -- it is functioning exactly as designed, and humanity is the product.",
    # 51: The Haunting Veil Beckons from the Abyss
    55: "The boundary between realities thins to gossamer. The Veil itself beckons -- not as a barrier, but as an invitation from the abyss. Something on the other side is reaching through, and its touch leaves marks that do not heal and memories that do not fade.",
    # 52: Stepping off the Treadmill
    56: "The endless escalation of corporate ambition falls away. Stephen steps off the treadmill of power and progress to confront deeper truths -- truths that cannot be engineered, replicated, or sold. The real journey was never about building an empire.",
    # 53: A Dreamwalker's Odyssey
    57: "Through multiple layers of the construct, the dreamwalker's odyssey stretches across impossible geographies of consciousness. Each layer peeled back reveals another, deeper prison -- and within each prison, echoes of those who walked this path before and were consumed.",
    # 54: Fractured Memories of a Quaking Abyss
    58: "Memory itself becomes a battlefield. The prison manipulates recollection, fracturing the past into unreliable fragments that quake and shift like tectonic plates. What you remember may never have happened. What you've forgotten might be the only thing that's real.",
    # 55: Manipulating the Mandala Effect
    59: "The Mandela Effect is no glitch -- it is a feature of the prison, a scar left by imperfect overwrites of history. Reality has been edited, and the edits are visible to those who know where to look. Manipulating the mandala means rewriting the prison's own code.",
    # 56: Dancing with the Devil in the Pale Moonlight
    60: "Under pale moonlight, a direct confrontation with dark cosmic forces unfolds. The devil wears many faces here -- some beautiful, some terrible, all hungry. The dance is ancient, the music is the grinding of reality against anti-reality, and the stakes are every soul in Etheris.",
    # 57: Back to Basics
    61: "After escalating cosmic conflict, a return to fundamentals. The most powerful weapon against the prison is not technology or cosmic power -- it is the simple, stubborn refusal to forget who you are. Back to basics. Back to the truth. Back to the beginning.",
    # 58: Mumbai's Moonlit Mob
    62: "In Mumbai's moonlit streets, global unrest erupts against S Corp's influence. The mob carries torches and smartphones, rage and hashtags. Resistance takes a thousand forms across a thousand cities, and the world's fury illuminates what S Corp's golden light conceals.",
    # 59: Golden Towers of Pyrite
    63: "The golden age reveals itself as pyrite -- fool's gold. S Corp's gleaming towers hide foundations of deception and unintended consequence. The cracks spider-web through every achievement, and the illusion of utopia begins its slow, magnificent collapse.",
    # 60: Elysium Risen
    64: "Elysium rises from the void -- humanity's greatest achievement, a station among the stars that represents everything the species has dreamed of becoming. But Elysium is more than a space station. It is a beacon, a challenge, and perhaps a trap, hanging in the dark between worlds.",
    # Book the Third intro
    65: "The sky falls, and beneath it, the final truths emerge. Book the Third opens with the heavens themselves in turmoil -- Elysium revealed as more than metal and ambition. The falling sky is not a catastrophe but an unveiling, and what lies beneath changes everything.",
    # 61: Jilted Tour Guides
    66: "Elysium's corridors hold secrets that no tour guide was meant to reveal. The station's true purpose emerges -- not just a haven among the stars but a nexus of cosmic significance. The guides have been jilted by their own creation, and the tourists are becoming pilgrims.",
    # 62: The Sleepers Awaken
    67: "Dormant entities stir to consciousness, awakened by Elysium's presence in the void. These sleepers have waited eons for this moment -- their awakening sends shockwaves through the fabric of reality. The universe holds its breath as ancient powers open their eyes.",
    # 63: No Sweat
    68: "A brief, deceptive calm before the final storm. No sweat, no strain -- just the quiet gathering of forces for what comes next. But the stillness is not peace; it is the silence of a universe holding its breath before the scream.",
    # 64: Adventures Beyond the Stars
    69: "Interstellar colonization accelerates through ERB portals, scattering humanity across the cosmos like seeds in a cosmic wind. Adventures beyond the stars reveal wonders and horrors in equal measure -- each new world a mirror reflecting humanity's greatest hopes and darkest fears.",
    # 65: Shadows Beneath the Vatican
    70: "Beneath the Vatican's ancient foundations, religious and occult forces converge in response to S Corp's cosmic discoveries. The shadows that lurk under centuries of doctrine are older than Christianity itself -- and they recognize what S Corp has awakened.",
    # 66: Stepping Into the Cosmic Unknown
    71: "Beyond the mapped territories of known space lies the truly alien. Stephen ventures into cosmic unknowns where the laws of physics are suggestions, not rules. Each step forward is a step away from everything human, and the unknown does not welcome visitors.",
    # 67: From Atlas Shrugged to The Dispossessed
    72: "The old world order collapses under the weight of its own obsolescence. Political philosophies from Atlas Shrugged to The Dispossessed play out simultaneously as humanity struggles to build meaning from the rubble of every institution it once trusted.",
    # 68: A Sorhhinda Sunset
    73: "Three suns paint Sorhhinda's sky in colors that have no names in any Earth language. This colony world -- established through ERB portals, sustained by hope and determination -- watches its first sunset as a sovereign civilization. Beauty and isolation intertwine beneath alien light.",
    # 69: The Gardener of Elysium
    74: "Stephen tends the garden of a new civilization with the patience of one who has seen empires rise and fall. The Gardener of Elysium cultivates not just crops and colonies, but the seeds of a future where humanity might finally outgrow its prison.",
    # 70: Cracks in the Monolith
    75: "S Corp's monolithic empire shows its first internal fractures. The cracks spread silently -- through boardrooms and colonies, through loyalties and convictions. No empire lasts forever, and the forces of entropy are patient, thorough, and absolutely merciless.",
    # 71: Stardust Dreams and Earthbound Realities
    76: "The tension between cosmic ambition and mortal fragility reaches its breaking point. Stardust dreams collide with earthbound realities -- the body fails where the spirit soars, and the gap between what humanity can imagine and what it can endure grows wider by the day.",
    # 72: Dawn of the Scarlet Tide
    77: "The Red Hat rebellion erupts into full-scale interstellar war. The scarlet tide sweeps across colony worlds and space stations, driven by Todd's fanatical crusade against S Corp. Holy war among the stars -- faith weaponized, humanity divided, and the cosmos painted red.",
    # 73: Galaxies Within Us
    78: "The cosmos is not just above -- it is within. The human psyche mirrors the universe in all its beauty and horror. Galaxies spin inside every consciousness, and the prison of Etheris is as much internal as external. Liberation begins not in the stars, but in the self.",
    # Book the Fourth intro
    79: "The pyre burns, and beneath its flames, the truth writhes. The final book begins with fire and revelation -- everything built across three acts of ambition and discovery is tested in the crucible of ultimate confrontation. What survives the pyre will be genuine.",
    # 74: Breach of the Dark Side
    80: "The Red Hats destroy the Pluto outpost and sever the Sorhhinda gateway. Todd declares holy war as Dr. On's betrayal is unmasked. The dark side has been breached, and through that breach pour enemies both human and cosmic, united only in their hatred of progress.",
    # 75: Beyond the Firewall
    81: "Humanity's defenses crumble against the combined assault of fanaticism and cosmic malice. The firewall between civilization and chaos has been breached, and beyond it lies a landscape of madness where humanity must cage its own fears or be consumed by them.",
    # 76: Expanding Outwards While Falling Inwards
    82: "S Corp reaches further into the cosmos even as its core disintegrates. The paradox of expansion and collapse plays out across light-years -- outposts multiply while foundations crumble. The center cannot hold, but the periphery refuses to stop growing.",
    # 77: Fractured Dreams of War
    83: "Full-scale war with the Red Hats shatters every dream of peaceful coexistence. Ancient entities return to the battlefield alongside human soldiers, and the Oenomancer's presence transforms conflict into something mythic, terrible, and older than civilization itself.",
    # lxxvii (interlude)
    84: "Roman numerals mark this passage between acts of cosmic war. In the space between chapters, the silence is heavier than any explosion. The war continues in the spaces between words, between breaths, between the ticks of a clock counting down to annihilation.",
    # 78: Echoes of a Fallen God
    85: "The echoes of divine conflict reverberate through every layer of reality. A god has fallen, and its death-cry is still ringing. Yaldabaoth's influence is finally revealed in its full, parasitic horror -- a demiurge feeding on the suffering of billions across millennia.",
    # Liber Infinitum
    86: "The infinite book opens its pages to those who survived the trials. Liber Infinitum -- the record of everything that was, is, and might yet be. Its pages are written in light and shadow, and reading them changes the reader as much as the knowledge changes the world.",
    # lxxviii (interlude)
    87: "Between the penultimate and final revelations, a moment of cosmic stillness. The Roman numerals mark a threshold -- behind lies everything that was endured, ahead lies everything that must be faced. The breath between heartbeats. The silence before the last word.",
    # 79: A New Beginning
    88: "Stephen wakes in his ordinary life -- wife, son, job hunt. Every memory of S Corp, of Elysium, of cosmic war fades like morning mist. He wins a trip to tour 'Lysteria' in space. The dream resets. But somewhere deep inside, the Engine still hums, waiting to be remembered.",
    # 80: Epilogue - Echoes of Elysium
    89: "Five hundred years later on Sorhhinda, a boy named Kai dreams of the Eternal Engine. His garden is attacked by subterranean horrors, awakening a power within him. Through that crack in reality, Yaldabaoth begins to seep back. The cycle is infinite. The echoes never fade.",
    # About the Author
    90: "Beyond the final page lies the truth that this story was never fiction. The author's hand trembled writing these words because they are not invented but remembered. Every tower, every dream, every engine -- echoes of something real, bleeding through the prison walls.",

    # ===== BOOK 2: Elysium Fallen =====
    # None (frontmatter)
    91: "The second tower rises from the ashes of the first. Elysium has fallen, but its fall is not an ending -- it is a descent into deeper truths. The prison tightens its grip, and the dreamwalker must now fight not for an empire, but for the right to remember who he truly is.",
    # Ch.1: The Last Innovation
    92: "In a decayed future where AI cured cancer but killed ambition, elderly Stephen dies in a hospice pod at 3:17 AM. Reality glitches -- strange symbols, reversed chanting, geometric patterns. The last innovation was not technology but awareness: the prison revealed itself in death.",
    # Ch. 2: The Kick
    93: "Stephen wakes as a teenager with the memories of a 74-year-old man trapped inside a young body. The kick between lives is violent, disorienting, and absolute. An old mind in young flesh, navigating a world that feels both achingly familiar and fundamentally, terrifyingly wrong.",
    # Ch. 3: DreamTrap
    94: "The dreams are not escape -- they are traps. Elaborate constructs designed to keep prisoners docile, cycling through manufactured fantasies while the real cage tightens. The dreamscape itself is a control mechanism, and recognizing the trap is the first step toward breaking it.",
    # Ch. 4: Echoes of Ends
    95: "Residual memories from previous lives bleed through the prison's firewalls. Deja vu on a cosmic scale -- fragments of deaths and rebirths echoing through corridors of time. The ends of past lives leave echoes that the prison cannot fully erase, and each echo is a clue.",
    # Ch. 5: When I Was Eight
    96: "Childhood memories reveal their true nature: implanted, manipulated, designed to anchor the prisoner to a false history. The innocence of being eight years old was never real -- it was architecture, carefully constructed to make the cage feel like home.",
    # Ch. 6: Frequency Bleed
    97: "Radio stations broadcast messages that should not exist. Reality's frequencies bleed into each other -- signals from outside the prison leaking through cracks in the infrastructure. The static between channels carries truths that the prison desperately tries to jam.",
    # Ch. 7: Echo Maps
    98: "The anomalies are not random -- they follow patterns. Stephen maps the prison's architecture through its glitches, charting reality's breakdowns like a cartographer of madness. Each echo mapped is another bar identified in the cage. The map grows. The prison's blueprint emerges.",
    # Ch. 8: The Veil Eats Back
    99: "The prison is not passive. It fights back against investigation -- activating countermeasures, corrupting allies, turning friends into surveillance tools. The Veil does not merely conceal; it consumes those who try to peer through it. Awareness has a price, and the Veil collects.",
    # Ch. 9: Fracture Point
    100: "Reality reaches its breaking point. Something fundamental in the prison's structure cracks -- not enough to escape through, but enough to see what lies on the other side. The fracture point is both a wound in the world and a window into freedom.",
    # Ch. 10: Dreams That Stay With You
    101: "Certain dreams refuse to evaporate at dawn. They persist into waking life with physical evidence -- objects that shouldn't exist, marks that can't be explained, knowledge that was never learned. The boundary between dream and reality has not just blurred; it has dissolved.",
    # Ch. 11: Those Who Remember Her
    102: "Whitney vanishes from reality itself -- erased, replaced by William. Only Stephen and a precious few retain any memory that she ever existed. Those who remember her become a resistance cell against the prison's most terrifying weapon: the ability to unmake a person completely.",
    # Ch. 12: Beneath the Trailer
    103: "Beneath the supernatural trailer in Wickham Park, the investigation into Whitney's erasure uncovers the prison's disposal mechanism. How inconvenient people are deleted from reality -- their memories, their belongings, their very existence surgically removed from the world.",
    # Dancing With the Devil In The Pale Moonlight (interlude)
    104: "Between revelations, the devil appears wearing a familiar face. The pale moonlight illuminates a dance as old as consciousness itself -- the eternal waltz between the prisoner and the warden, between awareness and oblivion, between the courage to see and the comfort of blindness.",
    # Ch. 13: The Name that Starts with A
    105: "A cosmic entity's true name surfaces from the depths of forbidden knowledge. Names carry power in Etheris -- to name something is to define it, to limit it, to gain leverage over it. The name that starts with A is a key that unlocks doors the prison would rather keep sealed.",
    # Ch. 14: The Audit
    106: "The prison's maintenance protocol activates. The Audit identifies threats to system stability and eliminates them -- through erasure, NPC replacement, or memory wipe. Stephen realizes with cold certainty that he has been flagged. The Audit is coming, and it does not negotiate.",
    # Ch. 15: Jennifer's Journal
    107: "A supernatural artifact surfaces -- a journal written by Whitney, whose birth name was Jennifer. Its text shifts and changes, revealing new truths as the reader becomes ready to receive them. Jennifer's Journal is not just a document; it is a living record of the prison's architecture.",
    # Ch. 16: Anchor Protocol
    108: "To resist being erased or replaced, Stephen and his surviving friends forge anchor points -- connections to reality too strong for the prison to sever cleanly. The Anchor Protocol is humanity's answer to the Audit: hold on to each other, or be deleted alone.",
    # Ch. 17: The Living Timeline
    109: "Time in Etheris is not a river but a layer cake -- multiple iterations running simultaneously, folded and compressed and bleeding into each other. The Living Timeline reveals that past, present, and future are all happening now, all within the same prison walls.",
    # Ch. 18: The Torturer's Name is I AM
    110: "Yaldabaoth is named at last. 'I AM' -- the entity running the prison, the demiurge who has tortured souls for eons. The torturer's name is the oldest lie: a claim of divinity that masks parasitic horror. To name the torturer is to begin dismantling the torture.",
    # Ch. 19: The Last Loop
    111: "The loop mechanism stands exposed -- the prison's reset function, its ability to recycle souls through endless iterations of suffering and forgetting. This is the last loop, or it is the beginning of an infinite number more. The choice to break free or be reset hangs in the balance.",
    # Ch. 20: And Then I Woke Up
    112: "Stephen wakes up. Again. The ambiguity is absolute -- is this escape or another iteration? Freedom or a more sophisticated cage? The five most terrifying words in the English language: and then I woke up. The cycle continues, and the question of reality remains unanswered.",
    # About Elysium Fallen
    113: "The second tower has fallen, but its collapse reveals the foundations beneath -- deeper truths, harder questions, and the terrible certainty that the prison is not broken. It is functioning exactly as designed. The fall of Elysium is not defeat; it is the prerequisite for escape.",

    # ===== BOOK 3: Escape from Elysium =====
    # None (frontmatter)
    114: "The final tower stands at the edge of everything. Escape from Elysium is not a destination but a transformation -- the culmination of three lifetimes of suffering, awakening, and the stubborn refusal to accept that the prison is all there is. The escape begins now.",
    # Part 1: Tears of the Veil
    115: "The Veil weeps. Its tears are the cracks through which truth bleeds into the prison -- each tear a wound in reality that cannot be sutured. Part One begins with the Veil's own grief, as if even the prison's walls know that what they contain was never meant to be caged.",
    # Chapter 1: Comfortably Numb
    116: "The climax of Yaldabaoth's defeat -- teenage Stephen delivers the killing blow. But the demiurge's dying words hint at resurrection. Victory is hollow, comfort is numbness, and the killing blow only proves that some things cannot be killed. They can only be temporarily silenced.",
    # Chapter 2: Smells Like Death
    117: "The aftermath of divine battle reeks of death and ozone. Reality is unstable, flickering like a dying light. The cost of confronting the demiurge is measured in broken timelines and fractured sanity. Death's smell lingers not because something died, but because something refuses to.",
    # Chapter 3: Circling the Grey
    118: "The Grey receives its latest traveler -- the purgatorial zone between prison iterations where souls are processed like data through a cosmic server. Circling in this limbo, Stephen exists in the space between deaths and rebirths, between loops, between versions of himself.",
    # Chapter 4: Losing My Religion
    119: "Every belief system collapses under the weight of cosmic truth. Faith, science, identity -- all the structures that held reality together dissolve into uncertainty. Losing religion is not losing God; it is discovering that the god you worshipped was your jailer all along.",
    # Chapter 5: A Love Like Drowning
    120: "Stephen and Jamie's bond transcends mortality, sanity, and the prison itself. A love like drowning -- terrifying, all-consuming, and ultimately transformative. Their connection is not romance but cosmology: two halves of a single divine entity remembering themselves across incarnations.",
    # Chapter 6: Is there Anybody Out There?
    121: "Stephen wakes as an adult -- unemployed, depressed, trapped in suburban monotony with an NPC wife. His call into the void echoes through empty rooms and scripted conversations. Is there anybody out there who is real? The silence that answers is the prison's cruelest response.",
    # Chapter 7: Placental Lies
    122: "The constructed nature of Stephen's current life is exposed like raw nerve. His marriage, his home, his history -- all fabricated by the prison with meticulous cruelty. Placental lies: the falsehoods that nourished his captive existence, now peeled away to reveal the void beneath.",
    # Chapter 8: Break on Through
    123: "Xavier notices the glitches first. Father and son begin peeling back layers of the simulation together -- each glitch a thread, each thread connected to the fabric of a reality that unravels more with every tug. Breaking through is a family affair, and the prison fears families.",
    # Part 2: Dissolution of Remembrance
    124: "Memory dissolves. The prison's most sophisticated weapon is not violence but forgetting -- the systematic dissolution of remembrance that keeps prisoners cycling through lives without ever accumulating enough awareness to escape. Part Two begins where memory ends.",
    # Chapter 9: House of the Rising Son
    125: "Xavier's true nature begins to emerge -- not just Stephen's son, but something cosmically significant. The Rising Son is a new kind of power, born inside the prison yet fundamentally incompatible with it. Xavier is a glitch made flesh, and the prison has no protocol for him.",
    # Chapter 10: Say My Name
    126: "Names carry divine power in Etheris. Stephen reclaims his true identity -- Aspolin. Xavier and Hannah's divine natures surface through the act of naming. To say a name is to claim sovereignty over reality itself, and the prison trembles when its prisoners remember who they truly are.",
    # Chapter 11: Love is a Dish Best Served Cold
    127: "Whitney makes contact after years of erasure. The reunion of friends the prison tried to unmake is an act of cosmic defiance. Love preserved across deletion, across resets, across the prison's every attempt to sever what it cannot control. Served cold, because it waited lifetimes.",
    # Chapter 12: Tiny Dancer
    128: "Hannah's role in the cosmic drama reveals itself -- she is serenity and joy incarnate, a spirit child who sacrificed her own incarnation to save her brother. The tiny dancer moves through reality with a grace that makes the prison's walls seem crude and temporary by comparison.",
    # Chapter 13: The Pink Pony Club
    129: "Surreal, darkly comic absurdity collides with existential horror. Maintaining normalcy in a collapsing simulation requires a special kind of madness -- the kind found in places where reality wears a costume and pretends everything is fine while the ceiling caves in.",
    # Chapter 14: Enter Sandman
    130: "TJ resurfaces as an excommunicated priest tormented by visions, fighting Yaldabaoth's influence from within the crumbling walls of organized religion. His sacrifice buys time that cannot be measured in minutes but in souls saved. The Sandman enters, and TJ does not flinch.",
    # Part 3: The Seed Bleeds
    131: "The Cosmic Seed -- Yaldabaoth's prison within the prison -- begins to hemorrhage. Its containment fails not with a bang but with a slow, arterial bleed that stains reality red. Part Three begins with the terrible certainty that what was contained is coming back.",
    # Chapter 15: Wake Me Up
    132: "Stephen fully awakens -- not gradually, not partially, but completely. The prison's hold shatters like glass around a consciousness that has finally remembered its own magnitude. The road trip with Xavier begins: father and son against the architecture of captive reality.",
    # Chapter 16: Back in Black
    133: "Powers manifest as Stephen and Xavier journey toward Elysium, shedding the prison's influence with each mile. Back in black -- reclaimed, restored, and radiating the kind of power that makes the prison's walls vibrate with structural fear. The pilgrimage nears its destination.",
    # Chapter 17: Stardust and Suicide
    134: "The existential weight of cosmic awareness presses down with crushing force. Stephen confronts the temptation to simply stop existing -- the seductive whisper that oblivion is easier than responsibility. But stardust does not choose to stop burning. It burns until it becomes something new.",
    # Chapter 18: Somewhere Over the Rainbow
    135: "The council of gods convenes on Elysium. Stephen meets the full pantheon -- Chernobog, Nyarlathotep, Tiamat, Hecate, Thoth, Yeshua. The Shepherd Initiative is revealed: re-enter the prison as divine guides. The family volunteers. Somewhere over the rainbow, the real work begins.",
    # Epilogue: Paint it Black
    136: "Elderly Kai tends his garden on Sorhhinda when subterranean horrors erupt. His rage tears the boundary between reality and anti-reality. Through that wound, Yaldabaoth escapes the Cosmic Seed, possesses Kai, and declares 'I AM.' Sophia weeps. The cycle is infinite. Paint it black.",
    # Afterward
    137: "The towers stand in memory -- Elysium Rising, Elysium Fallen, Escape from Elysium. Three acts in a cosmic drama that has no final curtain. The afterward is not an ending but a continuation, because the story of consciousness versus its cage never truly concludes.",
    # Notes and Appendices
    138: "Beyond the narrative lies the architecture -- the notes and appendices that map the prison from the outside. Every equation, every timeline, every theological framework is a brick in the wall between ignorance and understanding. The appendices are weapons disguised as footnotes.",
}

def main():
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    updated = 0
    errors = []

    for chapter_id, text in TRANSITION_TEXTS.items():
        if len(text) < 100:
            errors.append(f"ID {chapter_id}: text too short ({len(text)} chars)")
            continue
        try:
            cur.execute(
                "UPDATE chapters SET transition_lore_text = %s WHERE id = %s",
                (text, chapter_id)
            )
            if cur.rowcount == 1:
                updated += 1
            else:
                errors.append(f"ID {chapter_id}: no row updated (rowcount={cur.rowcount})")
        except Exception as e:
            errors.append(f"ID {chapter_id}: {e}")

    conn.commit()

    # Verification
    cur.execute("""
        SELECT COUNT(*) FROM chapters
        WHERE transition_lore_text LIKE 'You have conquered%%'
        OR transition_lore_text LIKE '%%the trials of%%'
        OR LENGTH(transition_lore_text) < 100
    """)
    remaining = cur.fetchone()[0]

    # Sample 5 random chapters
    cur.execute("""
        SELECT ch.id, ch.chapter_number, ch.title, b.title as book_title,
            ch.transition_lore_text, LENGTH(ch.transition_lore_text) as text_len
        FROM chapters ch
        JOIN books b ON ch.book_id = b.id
        ORDER BY RANDOM()
        LIMIT 5
    """)
    samples = cur.fetchall()

    print(f"=== TRANSITION LORE UPDATE RESULTS ===")
    print(f"Total updated: {updated}")
    print(f"Remaining template texts: {remaining}")
    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")

    print(f"\n=== 5 RANDOM SAMPLES ===")
    for s in samples:
        print(f"\n[ID={s[0]}] B{s[3]} Ch{s[1]}: {s[2]} ({s[5]} chars)")
        print(f"  {s[4]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
