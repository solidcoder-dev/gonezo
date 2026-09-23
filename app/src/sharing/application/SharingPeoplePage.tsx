import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SharingPersonItem, SharingPort } from './sharing.port';
import { SharingPeoplePageView } from '../ui/SharingPeoplePageView';

export type SharingPeoplePageProps = { readonly required: { readonly core: Pick<SharingPort, 'sharingListPeople' | 'sharingRenamePerson'> } };

export function SharingPeoplePage({ required }: SharingPeoplePageProps) {
  const navigate = useNavigate();
  const [people, setPeople] = useState<SharingPersonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPersonId, setSavingPersonId] = useState<string>();
  const [editingPersonId, setEditingPersonId] = useState<string>();
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void required.core.sharingListPeople().then((result) => { if (active) setPeople(result.items); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load sharing people'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [required.core]);

  function startEditing(person: SharingPersonItem) {
    setEditingPersonId(person.id);
    setEditingName(person.name);
    setError(undefined);
  }

  async function save() {
    if (!editingPersonId || !editingName.trim() || people.find((person) => person.id === editingPersonId)?.name === editingName.trim()) return;
    if (!required.core.sharingRenamePerson) { setError('Renaming sharing people is unavailable on this device.'); return; }
    setSavingPersonId(editingPersonId);
    setError(undefined);
    try {
      await required.core.sharingRenamePerson({ personId: editingPersonId, displayName: editingName });
      setPeople((current) => current.map((person) => person.id === editingPersonId ? { ...person, name: editingName.trim() } : person));
      setEditingPersonId(undefined);
      setEditingName('');
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to rename sharing person');
    } finally {
      setSavingPersonId(undefined);
    }
  }

  return <SharingPeoplePageView people={people} loading={loading} savingPersonId={savingPersonId} editingPersonId={editingPersonId} editingName={editingName} error={error} onBack={() => void navigate(-1)} onStartEditing={startEditing} onNameChange={setEditingName} onSave={() => { void save(); }} />;
}
