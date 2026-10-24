// Hop Off looks local everywhere: the rules, maths and timing are the same,
// only the vehicle, the stops and the "get off" shout change.
export const SKINS = {
  harare: {
    city: "Harare",
    vehicle: "Kombi",
    shout: "Ndiburuke!",
    shoutHint: "Get off here",
    stops: ["Copa Cabana", "Fourth Street", "Rotten Row", "Avondale", "Belgravia", "Mount Pleasant", "Borrowdale", "Sam Levy's", "Chisipite", "Glen Lorne"],
  },
  nairobi: {
    city: "Nairobi",
    vehicle: "Matatu",
    shout: "Shuka!",
    shoutHint: "Get off here",
    stops: ["Ambassadeur", "Kencom", "Ngara", "Pangani", "Muthaiga", "Gigiri", "Runda", "Ruaka", "Banana", "Limuru"],
  },
  lagos: {
    city: "Lagos",
    vehicle: "Danfo",
    shout: "O wa o!",
    shoutHint: "Get off here",
    stops: ["CMS", "Obalende", "Ikoyi", "Lekki Phase 1", "Ikate", "Chevron", "Ajah", "Sangotedo", "Abraham Adesanya", "Awoyaya"],
  },
  london: {
    city: "London",
    vehicle: "Night bus",
    shout: "Get off!",
    shoutHint: "Ring the bell",
    stops: ["Trafalgar Sq", "Piccadilly", "Oxford Circus", "Marble Arch", "Paddington", "Notting Hill", "Shepherd's Bush", "Hammersmith", "Chiswick", "Kew"],
  },
};

const KEY = "hopoff.skin";

export function savedSkin() {
  try {
    const value = localStorage.getItem(KEY);
    return SKINS[value] ? value : "harare";
  } catch {
    return "harare";
  }
}

export function saveSkin(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* private mode */
  }
}
