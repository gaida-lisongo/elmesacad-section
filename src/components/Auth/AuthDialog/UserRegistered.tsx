
import { Icon } from "@iconify/react/dist/iconify.js"


export const UserRegistered = () => {
    return (
        <>
        <div className="mb-10 text-center mx-auto inline-block bg-primary p-3 rounded-md text-white">
          <div className="flex item-center gap-4">
            <Icon icon="ep:success-filled" className="text-xl bg-primary" />
            <p className="text-sm font-medium">Inscription enregistrée. Vous pouvez vous connecter.</p>
          </div>
        </div>
      </>
    )
}