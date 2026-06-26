import CharacterBuilder from '@/components/CharacterBuilder';
import { getCampaignContext } from './actions';

export default async function NewCharacterPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const campaign = await getCampaignContext(id);

  // Changed <main> to <div> for semantic HTML
  return (
    <div className="h-full bg-black">
      <CharacterBuilder campaign={campaign} />
    </div>
  );
}