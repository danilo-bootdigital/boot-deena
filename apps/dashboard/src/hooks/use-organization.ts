'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useOrganization() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/organizations`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        let orgs = await response.json();

        if (orgs.length === 0) {
          const email = session.user.email || 'user';
          const slug = email.split('@')[0].replace(/[^a-z0-9]/g, '-');
          const createRes = await fetch(`${API_URL}/organizations`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Minha Empresa', slug }),
          });
          if (createRes.ok) {
            const newOrg = await createRes.json();
            orgs = [{ ...newOrg, role: 'owner' }];
          }
        }

        setOrganizations(orgs);
        const savedOrgId = localStorage.getItem('currentOrgId');
        const saved = orgs.find((o: Organization) => o.id === savedOrgId);
        setCurrentOrg(saved || orgs[0] || null);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchOrg = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      localStorage.setItem('currentOrgId', orgId);
    }
  };

  return { organizations, currentOrg, switchOrg, loading };
}
