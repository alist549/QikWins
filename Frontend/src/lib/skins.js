// Hop Off routes. The rules, maths and timing are the same on every route;
// only the cities and the sky change. Each stop is a real city.
export const SKINS = {
  world: {
    city: "World Tour",
    vehicle: "Jet",
    shout: "Hop off!",
    stops: ["London", "Paris", "Dubai", "Mumbai", "Singapore", "Tokyo", "Sydney", "Rio", "New York", "Lagos"],
    sky: [0x1d4ed8, 0x38bdf8],
  },
  europe: {
    city: "Europe",
    vehicle: "Jet",
    shout: "Hop off!",
    stops: ["Lisbon", "Madrid", "Paris", "Amsterdam", "Berlin", "Prague", "Vienna", "Rome", "Athens", "Istanbul"],
    sky: [0x4338ca, 0x818cf8],
  },
  americas: {
    city: "Americas",
    vehicle: "Jet",
    shout: "Hop off!",
    stops: ["Toronto", "New York", "Miami", "Havana", "Mexico City", "Bogotá", "Lima", "São Paulo", "Rio", "Buenos Aires"],
    sky: [0xc2410c, 0xfb923c],
  },
  sun: {
    city: "Africa & Asia",
    vehicle: "Jet",
    shout: "Hop off!",
    stops: ["Cairo", "Nairobi", "Lagos", "Johannesburg", "Cape Town", "Dubai", "Mumbai", "Bangkok", "Shanghai", "Seoul"],
    sky: [0x0f766e, 0x2dd4bf],
  },
};

const KEY = "hopoff.route";

export function savedSkin() {
  try {
    const value = localStorage.getItem(KEY);
    return SKINS[value] ? value : "world";
  } catch {
    return "world";
  }
}

export function saveSkin(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* private mode */
  }
}
