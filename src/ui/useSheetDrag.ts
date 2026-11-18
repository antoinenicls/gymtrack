import { useEffect, useRef, type RefObject } from 'react';

/**
 * Glisser vers le bas pour fermer une feuille, comme sur iOS.
 *
 * Reprise de MacroTrack.
 *
 * Sans ca, sur iPhone, un glissement vers le bas dans une feuille dont le contenu ne
 * defile pas faisait rebondir toute la feuille (le geste remontait a la page) : la
 * feuille se decollait du bas de l'ecran, puis revenait. Desormais :
 *  - depuis l'en-tete, ou depuis le contenu quand il est tout en haut, la feuille suit
 *    le doigt vers le bas ; relachee assez bas (ou d'un geste vif), elle se ferme,
 *    sinon elle revient en place ;
 *  - un contenu qui defile defile normalement ; s'il n'y a rien a faire defiler, le
 *    geste est bloque au lieu de faire rebondir la page ;
 *  - un geste horizontal n'est jamais touche (curseurs, listes qui defilent de cote).
 *
 * Ecouteurs natifs non passifs : React n'en pose que des passifs sur `touchmove`, qui
 * ne peuvent pas empecher le rebond. Le decalage est ecrit directement dans le style
 * (pas d'etat React → pas de rendu a chaque pixel).
 */
export function useSheetDrag(
  panelRef: RefObject<HTMLElement>,
  scrollRef: RefObject<HTMLElement>,
  onClose: () => void,
  enabled: boolean
): void {
  // Ref : un `onClose` recree a chaque rendu ne doit pas reabonner les ecouteurs en
  // plein geste.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    const scroller = scrollRef.current;
    if (!enabled || !panel || !scroller) return;

    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;
    let offset = 0;
    let decided = false;
    let horizontal = false;
    let dragging = false;
    let inContent = false;

    const place = (px: number, animate: boolean) => {
      panel.style.transition = animate ? 'transform 240ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none';
      panel.style.transform = px > 0 ? `translate3d(0, ${px}px, 0)` : '';
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || !t) return;
      startX = t.clientX;
      startY = lastY = t.clientY;
      lastT = e.timeStamp;
      velocity = 0;
      offset = 0;
      decided = horizontal = dragging = false;
      inContent = scroller.contains(e.target as Node);
    };

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || !t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        decided = true;
        horizontal = Math.abs(dx) > Math.abs(dy);
        dragging = !horizontal && dy > 0 && (!inContent || scroller.scrollTop <= 0);
        // Part de la position actuelle du doigt : la feuille ne saute pas de 6 px.
        if (dragging) startY = t.clientY;
      }
      if (horizontal) return;
      if (dragging) {
        e.preventDefault();
        offset = Math.max(0, t.clientY - startY);
        const dt = e.timeStamp - lastT;
        if (dt > 0) velocity = (t.clientY - lastY) / dt;
        lastY = t.clientY;
        lastT = e.timeStamp;
        place(offset, false);
        return;
      }
      // La feuille ne suit pas le doigt : rien a faire defiler → pas de rebond.
      const scrollable = inContent && scroller.scrollHeight > scroller.clientHeight + 1;
      if (!scrollable) e.preventDefault();
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      const farEnough = offset > Math.min(140, panel.offsetHeight * 0.3);
      const flicked = velocity > 0.5 && offset > 24;
      if (farEnough || flicked) closeRef.current();
      else place(0, true);
    };

    panel.addEventListener('touchstart', onStart, { passive: true });
    panel.addEventListener('touchmove', onMove, { passive: false });
    panel.addEventListener('touchend', onEnd);
    panel.addEventListener('touchcancel', onEnd);
    return () => {
      panel.removeEventListener('touchstart', onStart);
      panel.removeEventListener('touchmove', onMove);
      panel.removeEventListener('touchend', onEnd);
      panel.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled, panelRef, scrollRef]);
}
