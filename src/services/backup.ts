/**
 * Sauvegarde complete et restauration.
 *
 * L'app est 100 % locale : les donnees ne vivent que dans l'IndexedDB de CE
 * telephone. Perdre l'appareil, effacer les donnees du navigateur ou vouloir
 * changer de telephone, c'est tout perdre. Ce fichier est la seule porte de
 * sortie, et la seule porte d'entree.
 *
 * PARCOURS GENERIQUE des magasins, volontairement : on n'enumere pas
 * « exercices, seances, routines… » a la main. Un magasin ajoute plus tard
 * serait sinon absent des sauvegardes sans que personne ne s'en apercoive,
 * jusqu'au jour ou quelqu'un restaure et constate qu'il manque quelque chose.
 * Ici, tout ce que la base contient part dans le fichier, par construction.
 */

import { DB_NAME, DB_VERSION, getDb } from './db';

export interface BackupFile {
  /** Marqueur de reconnaissance, pour refuser un JSON qui n'est pas une sauvegarde. */
  format: 'gymtrack-backup';
  /** Version du SCHEMA de la base, pas de l'app : c'est elle qui conditionne la relecture. */
  schemaVersion: number;
  exportedAt: string;
  /** Contenu de chaque magasin, tel quel. */
  stores: Record<string, unknown[]>;
}

const FORMAT = 'gymtrack-backup';

/** Lit la base entiere. Aucune transformation : ce qui sort est ce qui etait. */
export async function buildBackup(): Promise<BackupFile> {
  const db = await getDb();
  const stores: Record<string, unknown[]> = {};

  for (const name of Array.from(db.objectStoreNames)) {
    stores[name] = await db.getAll(name);
  }

  return {
    format: FORMAT,
    schemaVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    stores,
  };
}

/** Compte des elements par magasin, pour annoncer ce qu'on s'apprete a faire. */
export function summarizeBackup(backup: BackupFile): { total: number; detail: string } {
  const parts: string[] = [];
  let total = 0;

  const LABELS: Record<string, [string, string]> = {
    workouts: ['séance', 'séances'],
    exercises: ['exercice', 'exercices'],
    routines: ['routine', 'routines'],
    routineFolders: ['dossier', 'dossiers'],
    records: ['record', 'records'],
  };

  for (const [name, [singulier, pluriel]] of Object.entries(LABELS)) {
    const n = backup.stores[name]?.length ?? 0;
    total += n;
    if (n > 0) parts.push(`${n} ${n > 1 ? pluriel : singulier}`);
  }

  return { total, detail: parts.join(' · ') };
}

/**
 * Verifie qu'un JSON quelconque est bien une sauvegarde exploitable.
 *
 * On refuse une version de schema DIFFERENTE, dans les deux sens. Les
 * migrations d'IndexedDB se jouent a l'ouverture de la base, pas a l'insertion
 * de lignes : reinjecter des donnees d'un autre schema les ferait entrer sans
 * jamais passer par la migration, et on obtiendrait des routines a moitie
 * converties plutot qu'une erreur franche. Mieux vaut refuser et le dire.
 */
export function parseBackup(raw: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Ce fichier n’est pas lisible.');
  }

  if (
    typeof data !== 'object' ||
    data === null ||
    (data as BackupFile).format !== FORMAT ||
    typeof (data as BackupFile).stores !== 'object'
  ) {
    throw new Error('Ce fichier n’est pas une sauvegarde GymTrack.');
  }

  const backup = data as BackupFile;

  if (backup.schemaVersion !== DB_VERSION) {
    throw new Error(
      backup.schemaVersion > DB_VERSION
        ? 'Cette sauvegarde vient d’une version plus récente de l’app. Mets GymTrack à jour sur cet appareil, puis réessaie.'
        : 'Cette sauvegarde vient d’une version plus ancienne de l’app. Ouvre GymTrack sur l’ancien téléphone pour le mettre à jour, puis refais l’extraction.',
    );
  }

  return backup;
}

/**
 * REMPLACE le contenu de la base par celui de la sauvegarde.
 *
 * Remplacement et non fusion, assume : fusionner deux historiques sans
 * identifiant commun produirait des doublons impossibles a demeler a la main.
 * « Retrouver mon telephone precedent » veut dire retrouver son etat, pas un
 * melange des deux. L'ecran previent avant.
 *
 * Chaque magasin est vide puis rempli dans UNE transaction : une restauration
 * interrompue au milieu laisserait sinon une base a moitie ecrasee, ce qui est
 * pire que les deux etats de depart.
 */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const db = await getDb();
  const names = Array.from(db.objectStoreNames).filter((name) => name in backup.stores);

  const tx = db.transaction(names, 'readwrite');

  for (const name of names) {
    const store = tx.objectStore(name);
    await store.clear();
    for (const item of backup.stores[name] ?? []) {
      await store.put(item as never);
    }
  }

  await tx.done;
}

/** Nom de fichier parlant, avec la date : on en accumule plusieurs. */
export function backupFilename(): string {
  return `${DB_NAME}-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
}
