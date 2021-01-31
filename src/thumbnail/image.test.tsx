import * as React from "react";
import {shallow, ShallowWrapper} from "enzyme";

import {Image} from './image';

describe("gallery/image", () => {
    let component: ShallowWrapper;

    function remount(names?: string[], format?: string) {
        const files = {
            path: "/tmp/nowhere",
            names: names || ["a.png"],
        };

        component = shallow(<Image files={files} index={0} pathFormat={format} />);
    }

    test("renders", () => {
        remount();
    });

    [
        {
            name: "replaces file stems",
            format: "/asdf/{fileStem}.img",
            expected: "/asdf/my-file.img",
        },
        {
            name: "replaces full names",
            format: "/asdf-{fileName}",
            expected: "/asdf-my-file.png",
        },
        {
            name: "passes through patternless input",
            format: "/not-available.jpg",
            expected: "/not-available.jpg",
        },
        {
            name: "replaces multiple matches",
            format: "/thumbnails{directory}/{fileStem}.jpg",
            expected: "/thumbnails/tmp/nowhere/my-file.jpg",
        },
        {
            name: "replaces empty brackets only as file name",
            format: "/thumbnails/{}",
            expected: "/thumbnails/my-file.png",
        },
        {
            name: "replaces 0 as file name",
            format: "/thumbnails/{0}",
            expected: "/thumbnails/my-file.png",
        },
        {
            name: "replaces 1 as file stem",
            format: "/thumbnails/{1}",
            expected: "/thumbnails/my-file",
        },
    ].forEach(({name, format, expected}) => test(name, () => {
        remount(["my-file.png"], format);
        expect(component.find("img").props().src).toEqual(`file://${expected}`);
    }));
});