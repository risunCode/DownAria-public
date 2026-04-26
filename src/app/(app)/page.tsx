import { Suspense } from 'react';

import { HomePage } from '@/modules/downloader';

export default function Page() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
