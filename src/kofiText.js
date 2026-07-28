const KOFI_DRINKS = [
  "coffee",
  "tea",
  "brew",
  "drink",
  "boba tea",
  "milkshake",
  "smoothie",
  "milk tea"
];


const KOFI_CHARACTERS = [

  // Champions
  {
    name: "Argon",
    full: "Champion Argon",
    type: "Champion"
  },
  {
    name: "Lilu",
    full: "Champion Lilu",
    type: "Champion"
  },
  {
    name: "Sia",
    full: "Champion Sia",
    type: "Champion"
  },
  {
    name: "Yami",
    full: "Champion Yami",
    type: "Champion"
  },
  {
    name: "Rudo",
    full: "Champion Rudo",
    type: "Champion"
  },
  {
    name: "Polonia",
    full: "Champion Polonia",
    type: "Champion"
  },
  {
    name: "Donovan",
    full: "Champion Donovan",
    type: "Champion"
  },
  {
    name: "Hemma",
    full: "Champion Hemma",
    type: "Champion"
  },
  {
    name: "Ashley",
    full: "Champion Ashley",
    type: "Champion"
  },
  {
    name: "Bjorn",
    full: "Champion Bjorn",
    type: "Champion"
  },
  {
    name: "Malady",
    full: "Champion Malady",
    type: "Champion"
  },

  // Workers
  {
    name: "Wallace",
    role: "Blacksmith",
    full: "Wallace the Blacksmith",
    type: "Worker"
  },
  {
    name: "Julia",
    role: "Tailor",
    full: "Julia the Tailor",
    type: "Worker"
  },
  {
    name: "Allan",
    role: "Carpenter",
    full: "Allan the Carpenter",
    type: "Worker"
  },
  {
    name: "Maribel",
    role: "Herbalist",
    full: "Maribel the Herbalist",
    type: "Worker"
  },
  {
    name: "Grimar",
    role: "Wizard",
    full: "Grimar the Wizard",
    type: "Worker"
  },
  {
    name: "Katarina",
    role: "Jeweler",
    full: "Katarina the Jeweler",
    type: "Worker"
  },
  {
    name: "Freyja",
    role: "Priestess",
    full: "Freyja the Priestess",
    type: "Worker"
  },
  {
    name: "Theodore",
    role: "Master",
    full: "Theodore the Master",
    type: "Worker"
  },
  {
    name: "Evelyn",
    role: "Scholar",
    full: "Evelyn the Scholar",
    type: "Worker"
  },
  {
    name: "Roxanne",
    role: "Engineer",
    full: "Roxanne the Engineer",
    type: "Worker"
  },
  {
    name: "Sondra",
    role: "Sun Dragon",
    full: "Sondra the Sun Dragon",
    type: "Worker"
  },
  {
    name: "Mundra",
    role: "Moon Dragon",
    full: "Mundra the Moon Dragon",
    type: "Worker"
  },
  {
    name: "Yolanda",
    role: "Summoner",
    full: "Yolanda the Summoner",
    type: "Worker"
  },
  {
    name: "Tutu Mano",
    role: "Cook",
    full: "Tutu Mano the Cook",
    type: "Worker"
  },
  {
    name: "Kaipo",
    role: "Baker",
    full: "Kaipo the Baker",
    type: "Worker"
  },
  {
    name: "Yohan",
    role: "Bard",
    full: "Yohan the Bard",
    type: "Worker"
  },
  {
    name: "Roland",
    role: "Veteran",
    full: "Roland the Veteran",
    type: "Worker"
  },
  {
    name: "Zephyr",
    role: "Storm Elemental",
    full: "Zephyr the Storm Elemental",
    type: "Worker"
  },

  // Special Characters
  // These do not follow normal naming rules
  {
    name: "King Reinhold",
    references: [
      "the King",
      "King Reinhold"
    ],
    type: "Special"
  },

  {
    name: "Tamas",
    references: [
      "Tamas",
      "Champion Tamas",
      "Tamas the Leatherworker",
    ],
    type: "Special",
    eventCharacter: true
  },

  // Creator
  {
    name: "Shopkeeper",
    role: "Shopkeeper",
    type: "Creator"
  }
];


// -------------------------
// Random Selection
// -------------------------

function getRandomDrink() {
  return KOFI_DRINKS[
    Math.floor(Math.random() * KOFI_DRINKS.length)
  ];
}


function isTamasDay() {
  const today = new Date();

  return today.getMonth() === 3 &&
         today.getDate() === 1;
}


function getRandomCharacter() {

  // Tamas Day override
  if (isTamasDay()) {
    return KOFI_CHARACTERS.find(
      character => character.name === "Tamas"
    );
  }

  return KOFI_CHARACTERS[
    Math.floor(Math.random() * KOFI_CHARACTERS.length)
  ];
}


// =========================
// Character Formatting
// =========================

function formatRole(role, startsSentence = false) {
  const article = startsSentence ? "The" : "the";

  return `${article} ${role}`;
}


function getCharacterReference(character, startsSentence = false) {

  const roll = Math.random();


  // Special characters
  if (character.references) {

    let reference = character.references[
      Math.floor(
        Math.random() * character.references.length
      )
    ];

    if (startsSentence && reference.startsWith("the ")) {
      reference =
        "The " + reference.substring(4);
    }

    return reference;
  }


  switch (character.type) {

    case "Champion":
      return roll < 0.7
        ? character.name
        : character.full;


    case "Worker":

      if (roll < 0.5) {
        return formatRole(
          character.role,
          startsSentence
        );
      }

      if (roll < 0.8) {
        return character.name;
      }

      return character.full;


    default:
      return character.name;
  }
}

const KOFI_PHRASES = [

  // =========================
  // Character + Drink
  // =========================

  {
    text: "Treat {character} to a well-earned {drink}.",
    allowedFormats: ["name", "title", "full"],
    needsDrink: true
  },

  {
    text: "Send a {drink} to {character}.",
    allowedFormats: ["name", "title"],
    needsDrink: true
  },

  {
    text: "Grab {character} a {drink}.",
    allowedFormats: ["name", "title", "full"],
    needsDrink: true
  },

  {
    text: "Keep {character} going with a {drink}.",
    allowedFormats: ["name", "title"],
    needsDrink: true
  },

  {
    text: "Help {character} take a well-deserved break.",
    allowedFormats: ["name", "title", "full"]
  },

  {
    text: "Give {character} a little extra support.",
    allowedFormats: ["name", "title", "full"]
  },


  // =========================
  // Shopkeeper
  // =========================

  {
    text: "Help keep the Shopkeeper going with a {drink}.",
    needsDrink: true
  },

  {
    text: "The Shopkeeper could use a {drink} break.",
    needsDrink: true
  },


  // =========================
  // Companion App
  // =========================

  {
    text: "Help keep the Companion app growing.",
  },

  {
    text: "Support continued development of the Companion app."
  },
  
  // =========================
  // General
  // =========================
  {
    text: "Help keep the lights on."
  },
  {
    text: "Every little bit helps keep this project going."
  }
];