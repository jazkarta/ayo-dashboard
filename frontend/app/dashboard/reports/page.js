import { redirect } from "next/navigation";

// import { Header } from "@/components/layout/header";

// export const metadata = {
//   title: "Reports",
// };

// export default function ReportsPage() {
//   return (
//     <>
//       <Header title="Reports" />
//       <main className="flex-1 overflow-y-auto scrollbar-thin">
//         <div className="p-6">
//           <p className="text-muted-foreground text-sm">
//             This page is coming soon.
//           </p>
//         </div>
//       </main>
//     </>
//   );
// }

export default function ReportsPage() {
  redirect("/dashboard");
}
