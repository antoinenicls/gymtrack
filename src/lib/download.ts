/**
 * Telechargement d'un fichier genere dans le navigateur.
 *
 * Extrait des reglages, ou il vivait seul, parce que l'historique en a besoin
 * aussi pour exporter une selection. Le detail qui compte et qu'on oublie : il
 * FAUT liberer l'URL objet, sinon le blob reste en memoire tant que l'onglet
 * vit, et sur une app qu'on garde ouverte toute la seance, ca s'accumule.
 */
export function downloadTextFile(
  content: string,
  filename: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Nom de fichier date du jour, format commun a tous les exports. */
export function datedFilename(prefix: string, extension = 'csv'): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}
