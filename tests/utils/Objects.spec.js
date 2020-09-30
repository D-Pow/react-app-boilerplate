import {
    isObject,
    deepCopy,
    deepCopyStructuredClone,
    diffObjects,
    objEquals,
    validateObjNestedFields
} from 'utils/Objects';

describe('Object utils', () => {
    class SampleCustomClass {
        a = 'A';
        b = 'B';
        func() {
            return this.a;
        }
    }

    const symbolKey = Symbol(80);

    class SampleComplexClass {
        var = 'hi';
        hiddenVal;
        arr = [
            {
                a: 'A'
            },
            {
                a: 'B'
            }
        ];
        [symbolKey] = 'val';
        map = new Map();

        constructor(initVal) {
            this.initVal = initVal;
            this.computedVal = this.getVar();
        }

        getVar() {
            return `Var is ${this.var}`;
        }

        arrowFunc = () => {
            return this.getVar() + '!';
        };

        get val() {
            return this.hiddenVal;
        }

        set val(newVal) {
            this.hiddenVal = newVal;
        }
    }

    async function testComplexClassDeepCopy(isStructuredClone = false) {
        const constructorVal = 'constVal';
        const orig = new SampleComplexClass(constructorVal);
        const xVal = 20;
        const yVal = 40;
        const mapKey = 'mapKey';
        const mapVal = 'mapVal';
        const mapObjKey = 'myObj';
        const mapObjVal = { a: 'A' };

        orig.map.set(mapKey, mapVal);
        orig.map.set(mapObjKey, mapObjVal);

        Object.defineProperties(orig, {
            x: {
                value: xVal,
                writable: true
            },
            y: {
                value: yVal,
                writable: false
            }
        });

        const reference = new SampleComplexClass();
        let copy;

        if (isStructuredClone) {
            copy = await deepCopyStructuredClone(orig);
        } else {
            copy = deepCopy(orig);
        }

        orig.hiddenVal = 'test';
        orig.var = 'test';
        orig.arr[0].a = 'test';
        orig.val = 'test';
        orig.x = 30;

        expect(copy.constructor.name).toEqual(orig.constructor.name);
        expect(copy instanceof SampleComplexClass).toBe(true);
        expect(copy instanceof SampleComplexClass).toBe(true);
        expect(orig.initVal).toEqual(constructorVal);
        expect(copy.initVal).toEqual(orig.initVal);
        expect(copy.computedVal).toEqual(orig.computedVal);
        expect(copy.var).not.toEqual(orig.var);
        expect(copy.arr).not.toEqual(orig.arr);
        expect(copy[symbolKey]).toEqual(orig[symbolKey]);
        expect(copy.getVar).toBeDefined();
        expect(copy.getVar()).not.toEqual(orig.getVar());
        expect(copy.getVar()).toEqual(reference.getVar());
        expect(copy.arrowFunc).toBeDefined();
        expect(copy.arrowFunc()).not.toEqual(orig.arrowFunc());
        expect(copy.arrowFunc()).toEqual(reference.arrowFunc());
        expect(copy.val).not.toEqual(orig.val);
        expect(copy.val).toEqual(reference.val);
        expect(copy[symbolKey]).toEqual(orig[symbolKey]);
        expect([...copy.map.entries()]).toEqual([...orig.map.entries()]);

        const newVal = 'test2';
        const newX = 50;
        const newInit = 'newInitVal';
        const newComputed = newVal + newInit;
        copy.val = newVal;
        copy.initVal = newInit;
        copy.computedVal = newComputed;
        copy.x = newX;
        copy.map.set(newVal, newInit);

        expect(copy.val).toEqual(newVal);
        expect(copy.val).not.toEqual(orig.val);
        expect(copy.val).not.toEqual(reference.val);
        expect(orig.initVal).toEqual(constructorVal);
        expect(copy.initVal).not.toEqual(orig.initVal);
        expect(copy.initVal).toEqual(newInit);
        expect(copy.computedVal).not.toEqual(orig.computedVal);
        expect(copy.computedVal).toEqual(newComputed);
        expect(copy.x).not.toEqual(xVal);
        expect(copy.x).not.toEqual(orig.x);
        expect(copy.x).not.toEqual(reference.x);
        expect(copy.x).toEqual(newX);
        expect(copy.y).toEqual(yVal);
        expect(Object.getOwnPropertyDescriptor(copy, 'x').writable).toBe(true);
        expect(Object.getOwnPropertyDescriptor(copy, 'y').writable).toBe(false);
        expect(copy.map.size).not.toEqual(orig.map.size);
        expect(copy.map.get(mapKey)).toEqual(orig.map.get(mapKey));
        expect(copy.map.get(newVal)).toEqual(newInit);
        expect(orig.map.get(newVal)).toBeUndefined();

        copy.map.set(mapKey, newComputed);
        copy.map.get(mapObjKey).a = newInit;

        expect(copy.map.get(mapKey)).toEqual(newComputed);
        expect(orig.map.get(mapKey)).toEqual(mapVal);
        expect(orig.map.get(mapObjKey)).toEqual(mapObjVal);
        expect(copy.map.get(mapObjKey)).not.toEqual(orig.map.get(mapObjKey));
        expect(copy.map.get(mapObjKey).a).toEqual(newInit);
    }

    async function testCircularReferenceDeepCopy(isStructuredClone = false) {
        const origA = { x: 'X' };
        const origB = { y: 'Y' };
        const a = {...origA};
        const b = {...origB};

        a.b = b;
        b.a = a;

        let copiedCircularA;

        if (isStructuredClone) {
            copiedCircularA = await deepCopyStructuredClone(a);
        } else {
            copiedCircularA = deepCopy(a);
        }

        const newX = 'Z';

        copiedCircularA.x = newX;

        expect(copiedCircularA.x).not.toEqual(a.x);
        expect(copiedCircularA.b.a).not.toEqual(a);
        expect(copiedCircularA.b.a).toEqual(copiedCircularA);
        expect(copiedCircularA.b.a.x).toEqual(newX);
        expect(a.b.a.x).not.toEqual(newX);
        expect(a.b.a.x).toEqual('X');
    }

    describe('deepCopy', () => {
        const objToCopy = {
            a: {
                b: 'B',
                c: 25,
                d: [ 1, 2, 3, 4 ]
            },
            getBinA() {
                return this.a.b;
            }
        };

        it('should deep copy an object, including arrays and objects', () => {
            const copiedObj = deepCopy(objToCopy);
            const expected = JSON.stringify(objToCopy);
            const received = JSON.stringify(copiedObj);

            expect(received).toEqual(expected);

            objToCopy.a.d[0] = 'test';
            objToCopy.a.b = 'test';

            expect(copiedObj).not.toEqual(objToCopy);
            expect(copiedObj.getBinA()).not.toEqual(objToCopy.getBinA());
        });

        it('should have new pointers for arrays in the copied object', () => {
            const copiedObj = deepCopy(objToCopy);

            copiedObj.a.d.push('newVal');

            expect(copiedObj.a.d.length).toEqual(objToCopy.a.d.length + 1);
        });

        it('should copy functions, variables, arrays, etc. from classes', async () => {
            await testComplexClassDeepCopy(false);
        });

        it('should handle circular references', async () => {
            await testCircularReferenceDeepCopy(false);
        });
    });

    // TODO add polyfill for MessageChannel in jest
    /*
    describe('deepCopyStructuredClone', async () => {
        it('should copy functions, variables, arrays, etc. from classes', async () => {
            await testComplexClassDeepCopy(true);
        });

        it('should handle circular references', async () => {
            await testCircularReferenceDeepCopy(true);
        });
    });
    */

    describe('validateObjNestedFields', () => {
        const objToValidate = {
            response: {
                data: {
                    someNestedData: 'myVal',
                    moreNesting: {
                        moreNestedData: 'anotherVal'
                    }
                }
            }
        };

        it('should check object validity by arguments of any length', () => {
            const received1 = validateObjNestedFields(objToValidate, 'response', 'data', 'someNestedData');
            const received2 = validateObjNestedFields(objToValidate, 'response', 'data', 'moreNesting');
            const received3 = validateObjNestedFields(objToValidate, 'response', 'data', 'moreNesting', 'moreNestedData');
            const received4 = validateObjNestedFields(objToValidate, 'response');
            const received5 = validateObjNestedFields(objToValidate);

            expect(received1).toBe(true);
            expect(received2).toBe(true);
            expect(received3).toBe(true);
            expect(received4).toBe(true);
            expect(received5).toBe(true);
        });

        it('should reject invalid objects', () => {
            const received1 = validateObjNestedFields(objToValidate, 'response-a', 'data', 'someNestedData');
            const received2 = validateObjNestedFields(objToValidate, 'response', 'data-a', 'someNestedData');
            const received3 = validateObjNestedFields(objToValidate, 'response', 'data', 'someNestedData-a');
            const received4 = validateObjNestedFields();
            const received5 = validateObjNestedFields(null);

            expect(received1).toBe(false);
            expect(received2).toBe(false);
            expect(received3).toBe(false);
            expect(received4).toBe(false);
            expect(received5).toBe(false);
        });

        it('should accept an array', () => {
            const received1 = validateObjNestedFields(objToValidate, ['response', 'data', 'someNestedData']);
            const received2 = validateObjNestedFields(objToValidate, ['response', 'data', 'moreNesting']);
            const received3 = validateObjNestedFields(objToValidate, ['response', 'data', 'moreNesting', 'moreNestedData']);
            const received4 = validateObjNestedFields(objToValidate, ['response']);
            const received5 = validateObjNestedFields(objToValidate);
            const receivedInvalid = validateObjNestedFields(objToValidate, 'response-a', 'data', 'someNestedData');

            expect(received1).toBe(true);
            expect(received2).toBe(true);
            expect(received3).toBe(true);
            expect(received4).toBe(true);
            expect(received5).toBe(true);
            expect(receivedInvalid).toBe(false);
        });
    });

    describe('diffObjects', () => {
        it('should find modified fields of any type in nested objects', () => {
            const a = {
                a: {
                    b: {
                        c: false,
                        d: {
                            e: null
                        },
                        f: {
                            g: {}
                        }
                    },
                    c: [
                        {
                            a: () => {}
                        },
                        {
                            a: () => {'a';}
                        }
                    ]
                },
                arr: [ 'a', 'b' ]
            };

            const b = {
                a: {
                    b: {
                        c: true,
                        d: {
                            e: undefined
                        },
                        f: {
                            g: {}
                        }
                    },
                    c: [
                        {
                            a: () => {}
                        },
                        {
                            a: () => {'b';}
                        }
                    ]
                },
                arr: [ 'a', 'b', 'c' ]
            };

            const delta = diffObjects(a, b);

            expect(delta.size).toBe(4);
            expect(delta).toContain('a.b.c');
            expect(delta).toContain('a.b.d.e');
            expect(delta).toContain('a.c[1].a');
            expect(delta).toContain('arr[2]');
        });

        it('should find elements that differ in nested arrays', () => {
            const a = {
                a: [
                    [ 0, 1 ]
                ]
            };
            const b = {
                a: [
                    [ 0, 2 ]
                ]
            };

            const delta = diffObjects(a, b);

            expect(delta.size).toBe(1);
            expect(delta).toContain('a[0][1]');
        });

        it('should optionally exclude array index values', () => {
            const a = {
                a: [
                    [ 0, 1 ]
                ],
                b: [ 'a', 'b' ],
                c: [
                    { x: 3, y: 4 }
                ],
                d: [ 0, 1 ]
            };
            const b = {
                a: [
                    [ 0, 2 ]
                ],
                b: [ 'a', 'b', 'c' ],
                c: [
                    { x: 3, y: 5, z: 6 }
                ],
                d: [ 0, 1 ]
            };

            const delta = diffObjects(a, b, false);

            expect(delta.size).toBe(4);
            expect(delta).toContain('a');
            expect(delta).toContain('b');
            expect(delta).toContain('c.y');
            expect(delta).toContain('c.z');
        });

        it('should work for classes', () => {
            const a = new SampleCustomClass();
            const b = new SampleCustomClass();
            const fieldToModify = 'a';

            const deltaSame = diffObjects(a, b);
            expect(deltaSame.size).toBe(0);

            b.c = 7;
            const deltaDiffNewField = diffObjects(a, b);
            expect(deltaDiffNewField.size).toBe(1);
            expect(deltaDiffNewField).toContain('c');

            a[fieldToModify] = 7;
            const deltaDiffModifiedField = diffObjects(a, b);
            expect(deltaDiffModifiedField.size).toBe(2);
            expect(deltaDiffModifiedField).toContain(fieldToModify);
            expect(deltaDiffModifiedField).toContain('c');
        });

        it('should work for variables that are not "real" objects', () => {
            const nonObjectTypes = [
                [ 'a', 'b' ],
                [ 1, 2 ],
                [ null, undefined ],
                [ () => {}, () => {'a'} ]
            ];

            const testDiffForNonObjects = (a, b) => {
                const deltaString = diffObjects(a, b);
                expect(deltaString.size).toBe(1);
                expect(deltaString).toContain('.');
            };

            nonObjectTypes.forEach(([ arg1, arg2 ]) => {
                testDiffForNonObjects(arg1, arg2);
                expect(diffObjects(arg1, arg1).size).toBe(0);
                expect(diffObjects(arg2, arg2).size).toBe(0);
            });
        });

        it('should diff arrays with and without optional boolean index value inclusion', () => {
            const a = [
                [ 'a', 'b', 'c' ],
                [ 'd', 'e', 'f' ],
                [ {}, {}, {} ],
                {
                    g: 'G'
                }
            ];
            const b = [
                [ 'a', 'W', 'X' ],
                [ 'd', 'Y', 'Z' ],
                [ {}, {}, {} ],
                {
                    g: 'G'
                }
            ];

            const deltaWithIndexVals = diffObjects(a, b);
            const deltaWithoutIndexVals = diffObjects(a, b, false);

            expect(deltaWithIndexVals.size).toBe(4);
            expect(deltaWithIndexVals).toContain('[0][1]');
            expect(deltaWithIndexVals).toContain('[0][2]');
            expect(deltaWithIndexVals).toContain('[1][1]');
            expect(deltaWithIndexVals).toContain('[1][2]');

            expect(deltaWithoutIndexVals.size).toBe(2);
            expect(deltaWithoutIndexVals).toContain('[0]');
            expect(deltaWithoutIndexVals).toContain('[1]');
        });
    });

    describe('objEquals', () => {
        const notEqual1Obj1 = {
            a: {
                b: 25
            }
        };
        const notEqual1Obj2 = {
            a: {
                b: '25'
            }
        };
        const notEqual2Obj1 = {
            a: {
                b: 'B',
                c: 25,
                d: [ 1, 2, 3, 4 ]
            }
        };
        const notEqual2Obj2 = {
            a: {
                b: 'B',
                c: 25,
                d: [ 2, 1, 4, 3 ]
            }
        };
        const equalObj1 = {
            a: {
                b: 'B',
                c: 25,
                d: [ 2, 1, 4, 3 ]
            }
        };
        const equalObj2 = {
            a: {
                c: 25,
                d: [ 2, 1, 4, 3 ],
                b: 'B'
            }
        };

        it('should consider two objects equal only if values have the same types', () => {
            expect(objEquals(notEqual1Obj1, equalObj1)).toBe(false);
            expect(objEquals(notEqual1Obj1, notEqual1Obj2)).toBe(false);
        });

        it('should take array order into account', () => {
            expect(objEquals(notEqual2Obj1, notEqual2Obj2)).toBe(false);
        });

        it('should consider two objects equal regardless of order of key-val declarations', () => {
            expect(objEquals(equalObj1, equalObj2)).toBe(true);
        });
    });

    describe('isObject', () => {
        it('should return false for all non-object-like variables', () => {
            const nonObjectVariables = [
                'hello',
                5,
                true,
                undefined,
                Symbol()
            ];

            nonObjectVariables.forEach(type => {
                expect(isObject(type)).toBe(false);
            });
        });

        it('should process object-like variables according to the respective option boolean', () => {
            const likeObjects = [
                {
                    variable: null,
                    field: 'includeNull'
                },
                {
                    variable: [],
                    field: 'includeArrays'
                },
                {
                    variable: () => {},
                    field: 'includeFunctions'
                }
            ];
            const includeValues = [ true, false ];

            likeObjects.forEach(sample => {
                includeValues.forEach(expected => {
                    const { variable, field } = sample;
                    const received = isObject(variable, {
                        [field]: expected
                    });

                    expect(received).toBe(expected);
                });
            });
        });

        it('should process classes vs object literals according to the respective options', () => {
            const classTypes = [
                new SampleCustomClass(), // custom class
                new Date(), // native class
                new String() // primitive wrapper
            ];

            expect(isObject({})).toBe(true);
            expect(isObject({}, { includeClasses: false })).toBe(true);

            classTypes.forEach(classType => {
                expect(isObject(classType)).toBe(true);
                expect(isObject(classType, { includeClasses: false })).toBe(false);
                expect(isObject(classType, { includeClasses: true })).toBe(true);
            });
        });
    });
});
