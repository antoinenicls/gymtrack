/**
 * Decoupage d'une seance en groupes de supersets.
 *
 * Un superset n'est pas une propriete d'un exercice isole : c'est une SUITE
 * d'exercices voisins qui partagent le meme groupe. Tant que chaque bloc se
 * dessinait tout seul, le filet bleu se rompait entre eux et l'ensemble ne se
 * lisait pas comme une unite. Ce decoupage rend cette unite explicite, pour que
 * l'affichage n'ait plus qu'a l'entourer une fois.
 *
 * L'ADJACENCE est exigee : deux exercices du meme groupe separes par un
 * troisieme forment deux suites distinctes. Un trait qui engloberait
 * l'intrus dirait qu'il fait partie du superset, ce qui serait faux.
 */

interface Grouped {
  supersetGroup: string | null;
}

/**
 * Lettre de chaque suite : A, B, C… pour les supersets, rien pour un exercice
 * seul.
 *
 * Deux supersets qui se suivent se ressemblaient trait pour trait (meme filet,
 * meme intitule) et on ne voyait pas ou l'un finissait. La lettre les nomme,
 * et elle reprend la convention des programmes ecrits (A1/A2, B1/B2), donc elle
 * ne s'apprend pas.
 *
 * Seules les suites de deux exercices ou plus consomment une lettre : un
 * exercice isole entre deux supersets ne doit pas decaler l'alphabet.
 */
export function supersetLetters<T extends Grouped>(runs: T[][]): (string | null)[] {
  let rang = 0;
  return runs.map((run) => {
    if (run.length < 2) return null;
    // Au-dela de Z, on repart a A plutot que de sortir des lettres : une
    // seance de plus de 26 supersets n'existe pas, et un caractere exotique
    // serait pire que la repetition.
    const lettre = String.fromCharCode(65 + (rang % 26));
    rang += 1;
    return lettre;
  });
}

export function supersetRuns<T extends Grouped>(entries: T[]): T[][] {
  const runs: T[][] = [];

  for (const entry of entries) {
    const current = runs[runs.length - 1];
    const last = current?.[current.length - 1];

    if (
      current &&
      last &&
      entry.supersetGroup !== null &&
      last.supersetGroup === entry.supersetGroup
    ) {
      current.push(entry);
    } else {
      runs.push([entry]);
    }
  }

  return runs;
}
