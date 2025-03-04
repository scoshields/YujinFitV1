import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus } from 'lucide-react';
import { PartnerCard } from '../components/partners/PartnerCard';
import { AddPartnerModal } from '../components/partners/AddPartnerModal';
import { getPartners, respondToInvite, cancelInvite } from '../services/partners';

interface Partner {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  partner?: {
    id: string;
    name: string;
    username: string;
  };
  user?: {
    id: string;
    name: string;
    username: string;
  };
}

export function Partners() {
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [partners, setPartners] = useState<{ sent: Partner[]; received: Partner[] }>({
    sent: [],
    received: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPartners = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPartners();
      setPartners(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partners');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await respondToInvite(inviteId, 'accepted');
      await loadPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await respondToInvite(inviteId, 'rejected');
      await loadPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline invite');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelInvite(inviteId);
      await loadPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invite');
    }
  };

  const filteredPartners = {
    sent: partners.sent.filter(p => 
      p.partner?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partner?.username.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    received: partners.received.filter(p =>
      p.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user?.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
  };

  return (
    <div className="min-h-screen bg-black pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Workout Partners</h1>
            <p className="text-gray-400">Connect and train with others to stay motivated</p>
          </div>
          <button
            onClick={() => setShowAddPartner(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-green-400 rounded-lg hover:opacity-90 transition-opacity"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Partner</span>
          </button>
        </div>

        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search partners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-blue-500/20 rounded-lg focus:outline-none focus:border-blue-500/50 text-white pl-12"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
        </div>

        {error && (
          <div className="text-red-400 text-center mb-6">{error}</div>
        )}

        {isLoading ? (
          <div className="text-center text-gray-400">Loading partners...</div>
        ) : (
          <div className="space-y-8">
            {filteredPartners.received.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Received Invites</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPartners.received.map((invite) => (
                    <PartnerCard
                      key={invite.id}
                      id={invite.id}
                      name={invite.user?.name || ''}
                      username={invite.user?.username || ''}
                      workoutCount={0}
                      joinedDate={new Date(invite.created_at).toLocaleDateString()}
                      status={invite.status}
                      direction="received"
                      onAccept={() => handleAcceptInvite(invite.id)}
                      onDecline={() => handleDeclineInvite(invite.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredPartners.sent.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Sent Invites</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPartners.sent.map((invite) => (
                    <PartnerCard
                      key={invite.id}
                      id={invite.id}
                      name={invite.partner?.name || ''}
                      username={invite.partner?.username || ''}
                      workoutCount={0}
                      joinedDate={new Date(invite.created_at).toLocaleDateString()}
                      status={invite.status}
                      direction="sent"
                      onCancel={() => handleCancelInvite(invite.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredPartners.sent.length === 0 && filteredPartners.received.length === 0 && (
              <div className="text-center text-gray-400">
                No partners found. Start by adding a workout partner!
              </div>
            )}
          </div>
        )}

        {showAddPartner && (
          <AddPartnerModal
            onClose={() => {
              setShowAddPartner(false);
              loadPartners();
            }}
          />
        )}
      </div>
    </div>
  );
}