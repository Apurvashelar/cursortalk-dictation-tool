import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Marquee } from '@/components/Marquee'
import { Features } from '@/components/Features'
import { HowItWorks } from '@/components/HowItWorks'
import { Privacy } from '@/components/Privacy'
import { Download } from '@/components/Download'
import { Pricing } from '@/components/Pricing'
import { Faq } from '@/components/Faq'
import { Footer } from '@/components/Footer'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <HowItWorks />
        <Privacy />
        <Download />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </>
  )
}
