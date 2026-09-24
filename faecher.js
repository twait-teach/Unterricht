// Welche Fächer und Klassen gibt es? Reihenfolge = Reihenfolge der Knöpfe oben.
// id der Klasse muss über alle Fächer eindeutig sein – sie steht in der Adresse (#ph9/1).
Portal.faecher([
  { name: 'Mathematik', klassen: [
    { id: 'm6', name: '6', ordner: 'mathematik/klasse-6' },
    { id: 'm8', name: '8', ordner: 'mathematik/klasse-8' },
  ]},
  { name: 'Physik', klassen: [
    { id: 'ph7', name: '7', ordner: 'physik/klasse-7' },
    { id: 'ph9', name: '9', ordner: 'physik/klasse-9' },
  ]},
]);
