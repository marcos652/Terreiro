import React from 'react';
import dynamic from 'next/dynamic';

const FundamentosPage = dynamic(() => import('@modules/fundamentos/FundamentosPage'), {
  ssr: false,
});

export default function Fundamentos() {
  return <FundamentosPage />;
}

