export const ColorConfiguration = () => {
    return (
        <>
            <h3 className=" text-black text-xl font-semibold mt-8 dark:text-white" >Colors</h3>
            <div className="p-6 rounded-md border mt-4 border-border dark:border-dark_border">
                <p className="text-base font-medium text-midnight_text dark:text-white/50" ><span className="font-semibold text-lg dark:text-white">1. Override Colors</span> <br />
                    For any change in colors : /src/utils/extendedConfig.ts</p>
                <div className="py-4 px-5 rounded-md bg-black mt-8">
                    <p className="text-sm text-gray-400 flex flex-col gap-2">
                        <span>--color-primary: #058ac5;</span>
                        <span>--color-darkprimary: #04719e;</span>
                        <span>--color-secondary: #e76067;</span>
                        <span>--color-midnight_text: #272826;</span>
                        <span>--color-muted: #8e8d8b;</span>
                        <span>--color-error: #e76067;</span>
                        <span>--color-warning: #e76067;</span>
                        <span>--color-light_grey: #e9ecef;</span>
                        <span>--color-grey: #f5f7fa;</span>
                        <span>--color-border: #e1e1e1;</span>
                        <span>--color-success: #058ac5;</span>
                        <span>--color-darkmode: #272826;</span>
                        <span>--color-darklight: #1e1f1d;</span>
                        <span>--color-dark_border: #3d3c3a;</span>
                        <span>--color-dark: #1e1f1d;</span>
                    </p>
                </div>
            </div>
            <div className="p-6 rounded-md border mt-4 border-border dark:border-dark_border">
                <p className="text-base font-medium text-midnight_text dark:text-white/50" ><span className="font-semibold text-lg dark:text-white">2. Override Theme Colors</span> <br />
                    For change , go to : /src/app/globals.css (@theme section)</p>
                <div className="py-4 px-5 rounded-md bg-black mt-8">
                    <p className="text-sm text-gray-400 flex flex-col gap-2">
                        <span>--color-primary: #058ac5;</span>
                        <span>--color-darkprimary: #04719e;</span>
                    </p>
                </div>
            </div>
        </>
    )
}