import React, { useState } from 'react';
import DocViewer from '../components/Docs/DocViewer';
import DocManager from '../components/Docs/DocManager';
import { useTenant } from '../lib/TenantContext';

export default function DocsPage() {
  const [isManageOpen, setIsManageOpen] = useState(false);
  const { isMaster } = useTenant();

  return (
    <>
      <DocViewer 
        onOpenManageModal={() => setIsManageOpen(true)} 
        isSuperAdmin={isMaster}
      />
      <DocManager 
        isOpen={isManageOpen} 
        onClose={() => setIsManageOpen(false)} 
      />
    </>
  );
}
