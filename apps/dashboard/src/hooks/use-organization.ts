'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/organizations`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (response.ok) {
        const orgs = await response.json();
        setOrganizations(orgs);
        // Auto-select first org or from localStorage
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
