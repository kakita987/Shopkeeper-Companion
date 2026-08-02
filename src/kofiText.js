// Drinks
const DRINKS = [
  { name: "coffee", weight: 5 },
  { name: "tea", weight: 5 },
  { name: "brew", weight: 4 },
  { name: "drink", weight: 2 },
  { name: "boba tea", weight: 1 },
  { name: "milkshake", weight: 1 },
  { name: "smoothie", weight: 1 },
  { name: "milk tea", weight: 1 }
];

// Character Name Pool
// Used when a phrase needs only the character's name.
const CHARACTER_NAMES = [
  "Argon",
  "Lilu",
  "Sia",
  "Yami",
  "Rudo",
  "Polonia",
  "Donovan",
  "Hemma",
  "Ashley",
  "Bjorn",
  "Malady",

  "Wallace",
  "Julia",
  "Allan",
  "Maribel",
  "Grimar",
  "Katarina",
  "Freyja",
  "Theodore",
  "Evelyn",
  "Roxanne",
  "Sondra",
  "Mundra",
  "Yolanda",
  "Tutu Mano",
  "Kaipo",
  "Yohan",
  "Roland",
  "Zephyr",

  "Durhan",
  "Gorza",
  "Tamas",
  "Juniper",
  "Brohm",
  "Jog",
  "Ismael",
  "Beatrice",
  "Maylee",
  "Serene",
  "Zolea",
  
  "King Reinhold"
];

// Character Title Pool
// Used when a phrase needs a role/title.
// Capitalization is handled separately.
const CHARACTER_TITLES = [
  "Blacksmith",
  "Tailor",
  "Carpenter",
  "Herbalist",
  "Wizard",
  "Jeweler",
  "Priestess",
  "Master",
  "Scholar",
  "Engineer",
  "Cook",
  "Baker",
  "Veteran",
  "Storm Elemental",

  "Miner",
  "Lumberjack",
  "Tanner",
  "Gardener",
  "Smelter",
  "Ironwood Sawyer",
  "Weaver",
  "Oil Presser",
  "Jewel Curator",
  "Ether Harvester",
  "Cryptkeeper",

  "King"
];

// Full Reference Pool
// Used when the phrase needs the complete character reference.

const CHARACTER_FULL = [
  "Champion Argon",
  "Champion Lilu",
  "Champion Sia",
  "Champion Yami",
  "Champion Rudo",
  "Champion Polonia",
  "Champion Donovan",
  "Champion Hemma",
  "Champion Ashley",
  "Champion Bjorn",
  "Champion Malady",

  "Wallace the Blacksmith",
  "Julia the Tailor",
  "Allan the Carpenter",
  "Maribel the Herbalist",
  "Grimar the Wizard",
  "Katarina the Jeweler",
  "Freyja the Priestess",
  "Theodore the Master",
  "Evelyn the Scholar",
  "Roxanne the Engineer",
  "Sondra the Sun Dragon",
  "Mundra the Moon Dragon",
  "Yolanda the Summoner",
  "Tutu Mano the Cook",
  "Kaipo the Baker",
  "Yohan the Bard",
  "Roland the Veteran",
  "Zephyr the Storm Elemental",

  "Durhan the Miner",
  "Gorza the Lumberjack",
  "Tamas the Tanner",
  "Juniper the Gardener",
  "Brohm the Smelter",
  "Jog the Ironwood Sawyer",
  "Ismael the Weaver",
  "Beatrice the Oil Presser",
  "Maylee the Jewel Curator",
  "Serene the Ether Harvester",
  "Zolea the Cryptkeeper",

  "King Reinhold"
];

// Tamas Day Character Pools

const TAMAS_DAY_CHARACTERS = [
  "Tamas",
  
  "Tamas the Blacksmith",
  "Tamas the Tailor",
  "Tamas the Engineer",
  "Tamas the Miner",
  "Tamas the Lumberjack",
  "Tamas the Gardener",
  "Tamas the Weaver",
  "Tamas the Jeweler",
  "Tamas the Summoner",
  "Tamas the Cook",
  "Tamas the Baker",
  "Tamas the Bard",
  "Tamas the Veteran",
  "Tamas the Herbalist",
  "Tamas the Priestess",
  "Tamas the Scholar",

  "Tamas the Miner",
  "Tamas the Lumberjack",
  "Tamas the Tanner",
  "Tamas the Gardener",
  "Tamas the Smelter",
  "Tamas the Ironwood Sawyer",
  "Tamas the Weaver",
  "Tamas the Oil Presser",
  "Tamas the Jewel Curator",
  "Tamas the Ether Harvester",
  "Tamas the Cryptkeeper",
];

// Support Recipients
// Used by phrases to determine who or what the support is directed toward.
// "Shopkeeper" refers to the creator/developer of Shopkeeper Companion.
// "Companion app" refers to the app itself.

const RECIPIENTS = {
  shopkeeper: {
    name: "Shopkeeper",
    articleRequired: false
  },

  app: {
    name: "Companion app",
    articleRequired: true
  }
};

// Phrase Templates
const PHRASES = [

  // Character + drink + Shopkeeper
  {
    text: "{character} thinks {recipient} deserves another {drink}.",
    characterFormat: "name",
    recipient: "shopkeeper",
    addRecipientArticle: "random",
    requiresDrink: true
  },

  // Character title + app
  {
    text: "{character} recommends supporting {recipient}.",
    characterFormat: "title",
    characterArticle: "sentence",
    recipient: "app",
    addRecipientArticle: true
  },

  // Full character + Shopkeeper
  {
    text: "Treat {character} to a well-earned {drink}.",
    characterFormat: "full",
    recipient: "shopkeeper",
    addRecipientArticle: true,
    requiresDrink: true
  },

  // App-only support
  {
    text: "Help keep {recipient} growing.",
    recipient: "app",
    addRecipientArticle: true
  },

  // Development-themed
  {
    text: "Help keep the lights on for {recipient}.",
    recipient: "app",
    addRecipientArticle: true
  },

  {
    text: "Support continued development of {recipient}.",
    recipient: "app",
    addRecipientArticle: true
  }

];

// Helpers
function random(array) {
  return array[Math.floor(Math.random() * array.length)];
}


export function formatCharacterTitle(title, articleStyle = 'lower') {
  const article = articleStyle === 'sentence' ? 'The' : 'the'
  return `${article} ${title}`
}


function isTamasDay() {
  const today = new Date();

  // April 1st
  return today.getMonth() === 3 &&
         today.getDate() === 1;
}


function getDrink() {
  return random(DRINKS);
}


function formatRecipient(type, articleSetting = "default") {
  const recipient = RECIPIENTS[type];

  if (!recipient) {
    return "";
  }

  // Companion app must always have "the"
  if (recipient.articleRequired) {
    return `the ${recipient.name}`;
  }

  // Shopkeeper can optionally have "the"
  if (articleSetting === "random") {
    return Math.random() < 0.5
      ? `the ${recipient.name}`
      : recipient.name;
  }

  if (articleSetting === true) {
    return `the ${recipient.name}`;
  }

  return recipient.name;
}


function getCharacter(format = "random", articleStyle = 'lower') {

  // Tamas Day overrides normal character logic
  if (isTamasDay()) {
    return random(TAMAS_DAY_CHARACTERS);
  }


  if (format === "name") {
    return random(CHARACTER_NAMES);
  }

  if (format === "title") {
    return formatCharacterTitle(random(CHARACTER_TITLES), articleStyle);
  }

  if (format === "full") {
    return random(CHARACTER_FULL);
  }


  // Random fallback if phrase allows multiple formats
  return random([
    random(CHARACTER_NAMES),
    random(CHARACTER_TITLES),
    random(CHARACTER_FULL)
  ]);
}

// Message Generator
// Exported as getRandomTavernText to match the name used across the app.
export function getRandomTavernText() {

  const phrase = random(PHRASES);
  let message = phrase.text;

  if (phrase.characterFormat) {
    message = message.replace(
      "{character}",
      getCharacter(phrase.characterFormat, phrase.characterArticle)
    );
  }

  if (phrase.recipient) {
    message = message.replace(
      "{recipient}",
      formatRecipient(
        phrase.recipient,
        phrase.addRecipientArticle
      )
    );
  }

  if (phrase.requiresDrink) {
    message = message.replace(
      "{drink}",
      getDrink().name
    );
  }

  return message;
}