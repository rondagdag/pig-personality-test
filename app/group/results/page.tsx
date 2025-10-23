'use client';

import { useEffect, useState } from 'react';
import { GroupParticipant, PlacementTallies } from '@/lib/types';
import { DISCUSSION_PROMPTS } from '@/lib/prompts';
import Link from 'next/link';

export default function GroupResultsPage() {
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [tallies, setTallies] = useState<PlacementTallies | null>(null);
  const [showTraits, setShowTraits] = useState(true);

  useEffect(() => {
    // Load participants from sessionStorage
    const stored = sessionStorage.getItem('groupParticipants');
    if (stored) {
      const data: GroupParticipant[] = JSON.parse(stored);
      setParticipants(data);
      calculateTallies(data);
    }
  }, []);

  const calculateTallies = (data: GroupParticipant[]) => {
    const tallies: PlacementTallies = {
      placement: { top: 0, middle: 0, bottom: 0 },
      orientation: { left: 0, right: 0, front: 0 },
      details: { many: 0, few: 0 },
      legs: { lessThanFour: 0, four: 0 },
    };

    data.forEach((p) => {
      // Placement
      if (p.placement === 'Top') tallies.placement.top++;
      else if (p.placement === 'Bottom') tallies.placement.bottom++;
      else tallies.placement.middle++;

      // Orientation
      if (p.orientation === 'Left') tallies.orientation.left++;
      else if (p.orientation === 'Right') tallies.orientation.right++;
      else tallies.orientation.front++;

      // Details
      if (p.detailLevel === 'Many') tallies.details.many++;
      else tallies.details.few++;

      // Legs
      if (p.legs < 4) tallies.legs.lessThanFour++;
      else tallies.legs.four++;
    });

    setTallies(tallies);
  };

  const discussionPrompts = DISCUSSION_PROMPTS;

  if (participants.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          No group data found. Please add participants first.
        </p>
        <Link href="/group" className="btn-primary">
          Go to Group Mode
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          🎉 Group Results
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Compare drawings and explore personality patterns
        </p>
      </div>

      {/* Summary Tallies */}
      {tallies && (
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Placement
            </h3>
            <div className="space-y-1 text-sm">
              <div>Top: <strong>{tallies.placement.top}</strong></div>
              <div>Middle: <strong>{tallies.placement.middle}</strong></div>
              <div>Bottom: <strong>{tallies.placement.bottom}</strong></div>
            </div>
          </div>

          <div className="card text-center">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Orientation
            </h3>
            <div className="space-y-1 text-sm">
              <div>Left: <strong>{tallies.orientation.left}</strong></div>
              <div>Right: <strong>{tallies.orientation.right}</strong></div>
              <div>Front: <strong>{tallies.orientation.front}</strong></div>
            </div>
          </div>

          <div className="card text-center">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Detail Level
            </h3>
            <div className="space-y-1 text-sm">
              <div>Many: <strong>{tallies.details.many}</strong></div>
              <div>Few: <strong>{tallies.details.few}</strong></div>
            </div>
          </div>

          <div className="card text-center">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Legs
            </h3>
            <div className="space-y-1 text-sm">
              <div>&lt;4: <strong>{tallies.legs.lessThanFour}</strong></div>
              <div>4: <strong>{tallies.legs.four}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Participants Table */}
      <div className="card mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            All Participants
          </h2>
          <button
            onClick={() => setShowTraits(!showTraits)}
            className="text-sm text-pink-600 hover:text-pink-700"
          >
            {showTraits ? 'Hide' : 'Show'} Traits
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Drawing
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Placement
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Orientation
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Legs
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {p.name}
                  </td>
                  <td className="px-4 py-3">
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {p.placement}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {p.orientation}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {p.legs}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {p.detailLevel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showTraits && (
          <div className="mt-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Individual Traits:</h3>
            {participants.map((p) => (
              <div key={p.id} className="border-l-4 border-pink-500 pl-4 py-2">
                <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 mt-1 space-y-1">
                  {p.traits.map((trait, i) => (
                    <li key={i}>• {trait}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discussion Prompts */}
      <div className="card bg-purple-50 dark:bg-purple-900/20 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          💬 Discussion Prompts
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Use these prompts to facilitate a group discussion about your results:
        </p>
        <ul className="space-y-3">
          {discussionPrompts.map((prompt, i) => (
            <li key={i} className="flex items-start">
              <span className="text-purple-600 dark:text-purple-400 font-bold mr-3">
                {i + 1}.
              </span>
              <span className="text-gray-700 dark:text-gray-300">{prompt}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <Link href="/group" className="btn-secondary">
          ← Back to Group Mode
        </Link>
        <Link href="/" className="btn-primary">
          Back Home
        </Link>
      </div>
    </div>
  );
}
