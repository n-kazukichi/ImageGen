import { SignOutButton, useUser } from "@clerk/nextjs";
import { type UserResource } from "@clerk/types";
import { Lato } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/router";
import { BiImage } from "react-icons/bi";
import DarkModeToggle from "~/components/DarkModeToggle";
import { ForEachCharacter } from "~/components/ForEachCharacter";
import LoadingIndicator from "~/components/LoadingIndicator";
import ImageWithFallback from "~/components/ImageWithFallback";
import { useMemo } from "react";
import { Menu } from "@headlessui/react";
import { MdOutlineGeneratingTokens } from "react-icons/md";
import { api } from "~/utils/api";
import { AnimatePresence, motion } from "framer-motion";

const font = Lato({
  weight: ["700"],
  subsets: ["latin"],
});

export default function Header() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  return (
    <header
      className="flex flex-row justify-between border-b border-gray-300/50 
    px-4 py-4 text-purple-600 shadow-md dark:border-b-violet-700"
    >
      <Link href="/" className="flex flex-row items-center">
        <BiImage fontSize={35} className="mr-3 hover:text-violet-400" />
        <div
          className="flex flex-row font-mono text-xl font-bold"
          style={font.style}
        >
          <ForEachCharacter
            text={"ImageGen"}
            className={"hover:text-violet-400"}
          />
        </div>
      </Link>

      <div className="flex flex-row items-center gap-2">
        {user && isSignedIn && (
          <SignOutButton signOutCallback={() => router.push("/")}>
            <button className="group relative flex flex-col gap-4 font-bold hover:text-purple-800">
              <span>Sign Out</span>
              <div className="absolute -bottom-1 mx-auto h-[2px] w-full origin-center scale-x-0 bg-purple-600 transition-all duration-200 group-hover:scale-x-100"></div>
            </button>
          </SignOutButton>
        )}

        {!isLoaded && <LoadingIndicator size={25} />}
        {user && <UserAvatar user={user} />}
        <DarkModeToggle />
      </div>
    </header>
  );
}

interface UserAvatarProps {
  user: UserResource;
}

function UserAvatar({ user }: UserAvatarProps) {
  const name = user.username || user.firstName || "User";
  const fallbackImg = useMemo(
    () => `https://placehold.co/64x64/9333ea/FFF?text=${name.slice(0, 2)}`,
    [name]
  );

  const tokenCountQuery = api.users.getTokenCount.useQuery();

  return (
    <Menu>
      {({ open }) => (
        <>
          <Menu.Button>
            <div className="overflow-hidden rounded-full shadow">
              <ImageWithFallback
                alt={name}
                src={user.imageUrl}
                quality={100}
                fallbackSrc={fallbackImg}
                width={30}
                height={30}
              />
            </div>
          </Menu.Button>

          <AnimatePresence>
            {open && (
              <Menu.Items
                static
                as={motion.ul}
                initial={{ opacity: 0, translateX: -60 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: -60 }}
                className="absolute right-14 top-14 z-40 flex flex-col gap-2 overflow-hidden rounded-lg border border-gray-200 
        bg-white p-1 shadow-md dark:border-violet-900/50 dark:bg-slate-900 dark:shadow-sm dark:shadow-violet-400/10"
              >
                <Menu.Item
                  as="li"
                  className="flex cursor-pointer flex-row items-center gap-4 rounded-lg px-5 py-2 hover:bg-violet-500 hover:text-white"
                >
                  <MdOutlineGeneratingTokens className="text-2xl" />
                  {tokenCountQuery.isLoading && (
                    <div className="px-10">
                      <LoadingIndicator size={25} />
                    </div>
                  )}
                  <span className="font-medium">
                    {tokenCountQuery.data != null && (
                      <>
                        {tokenCountQuery.data === "unlimited"
                          ? "Unlimited tokens"
                          : `${tokenCountQuery.data} ${
                              tokenCountQuery.data === 1 ? "token" : "tokens"
                            } left`}
                      </>
                    )}
                  </span>
                </Menu.Item>
              </Menu.Items>
            )}
          </AnimatePresence>
        </>
      )}
    </Menu>
  );
}
