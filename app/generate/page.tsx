import UrlInput from '@/components/urlInput'
import Welcome from '@/components/Welcome'

export default async function GeneratePage() {

  return (
    <>
      <div>Generate Page</div>
      <Welcome />
      <UrlInput />
    </>
  )
}